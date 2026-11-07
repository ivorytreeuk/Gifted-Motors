/**
 * Gifted Motors Records Portal - Google Sheets back end
 *
 * Paste this whole file into the Google Sheet (Extensions > Apps Script).
 * 1. Change the two passwords just below.
 * 2. Run the function called "setup" once. It builds every tab for you.
 * 3. Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 *
 * Passwords are checked here, on Google's side. They are never in the website files.
 * To change a password later: edit it below, then Deploy > Manage deployments > Edit > Version: New version > Deploy.
 */

// Optional: an email address that gets a message whenever a customer sends a booking request on the website.
// Leave empty ('') for no emails. The requests always appear on the "Booking requests" tab either way.
const NOTIFY_EMAIL = '';

const STAFF_PASSWORD = 'CHANGE-ME-STAFF';
const MANAGER_PASSWORD = 'CHANGE-ME-MANAGER';

// ---- Nothing below this line needs changing --------------------------------

const BOOKING_PREFIX = 'GM';
const SESSION_SECONDS = 21600; // 6 hours. After that, staff sign in again.

const SHEET = { hires: 'Hires', pays: 'Payments log', exp: 'Expenses', lists: 'Lists', reports: 'Monthly reports', requests: 'Booking requests', reviews: 'Reviews', readme: 'Read me' };
const HIRE_HEAD = ['Booking', 'Date', 'Customer', 'Phone', 'Vehicle', 'Registration', 'Daily rate (K)', 'Days', 'Total (K)', 'Paid so far (K)', 'Balance (K)', 'Prepaid?', 'Hire starts', 'Entered by', 'Entered at'];
const PAY_HEAD = ['Booking', 'Date paid', 'Customer', 'Type', 'Amount (K)', 'Entered by', 'Entered at'];
const EXP_HEAD = ['Ref', 'Date', 'What it was for', 'Category', 'Vehicle', 'Registration', 'Amount (K)', 'Entered by', 'Entered at'];
const REPORT_HEAD = ['Month', 'Money in (K)', 'Money out (K)', 'Net (K)', 'New hires', 'Balances owed at capture (K)', 'Prepayments held at capture (K)', 'Captured at'];
const REQ_HEAD = ['Request', 'Received', 'Status', 'Customer', 'Phone', 'Email', 'Vehicle', 'Pick-up date', 'Return date', 'Days', 'Pick-up place', 'Driver?', 'How they will pay', 'Notes'];
const REV_HEAD = ['Review', 'Received', 'Status', 'Name', 'Rating (1-5)', 'About', 'What they said', 'Decided at'];
const DEFAULT_VEHICLES = ['Toyota Land Cruiser Prado', 'Toyota Hilux', 'Honda Fit', 'Toyota Hiace van', 'Toyota Alphard / Vellfire'];
const DEFAULT_CATEGORIES = ['Fuel', 'Mechanic and repairs', 'Drivers', 'Marketing', 'Salaries', 'Other'];

// ============================================================================
// One-time setup
// ============================================================================

function setup() {
  const ss = SpreadsheetApp.getActive();
  const make = (name, head) => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#0E2A5B').setFontColor('#FFFFFF');
      sh.setFrozenRows(1);
    }
    return sh;
  };
  const hires = make(SHEET.hires, HIRE_HEAD);
  const pays = make(SHEET.pays, PAY_HEAD);
  const exp = make(SHEET.exp, EXP_HEAD);
  const reports = make(SHEET.reports, REPORT_HEAD);
  const requests = make(SHEET.requests, REQ_HEAD);
  const reviews = make(SHEET.reviews, REV_HEAD);
  reviews.getRange('A:A').setNumberFormat('@'); reviews.getRange('C:D').setNumberFormat('@'); reviews.getRange('F:G').setNumberFormat('@');
  reviews.getRange('B:B').setNumberFormat('dd mmm yyyy hh:mm'); reviews.getRange('H:H').setNumberFormat('dd mmm yyyy hh:mm');
  requests.getRange('A:A').setNumberFormat('@'); requests.getRange('C:F').setNumberFormat('@'); requests.getRange('K:N').setNumberFormat('@');
  requests.getRange('B:B').setNumberFormat('dd mmm yyyy hh:mm'); requests.getRange('H:I').setNumberFormat('dd mmm yyyy');
  const lists = make(SHEET.lists, ['Vehicles (edit this list)', 'Expense categories (edit this list)']);
  const readme = make(SHEET.readme, ['Gifted Motors records']);

  // Text columns stay as plain text so phone numbers keep their + and nothing is read as a formula.
  ['A:A', 'C:F', 'N:N'].forEach((a) => hires.getRange(a).setNumberFormat('@'));
  ['B:B', 'M:M'].forEach((a) => hires.getRange(a).setNumberFormat('dd mmm yyyy'));
  ['G:G', 'I:K'].forEach((a) => hires.getRange(a).setNumberFormat('#,##0.00'));
  hires.getRange('O:O').setNumberFormat('dd mmm yyyy hh:mm');
  ['A:A', 'C:D', 'F:F'].forEach((a) => pays.getRange(a).setNumberFormat('@'));
  pays.getRange('B:B').setNumberFormat('dd mmm yyyy');
  pays.getRange('E:E').setNumberFormat('#,##0.00');
  pays.getRange('G:G').setNumberFormat('dd mmm yyyy hh:mm');
  ['A:A', 'C:F', 'H:H'].forEach((a) => exp.getRange(a).setNumberFormat('@'));
  exp.getRange('B:B').setNumberFormat('dd mmm yyyy');
  exp.getRange('G:G').setNumberFormat('#,##0.00');
  exp.getRange('I:I').setNumberFormat('dd mmm yyyy hh:mm');
  reports.getRange('A:A').setNumberFormat('@');
  ['B:D', 'F:G'].forEach((a) => reports.getRange(a).setNumberFormat('#,##0.00'));
  reports.getRange('H:H').setNumberFormat('dd mmm yyyy hh:mm');

  if (lists.getLastRow() < 2) {
    lists.getRange(2, 1, DEFAULT_VEHICLES.length, 1).setValues(DEFAULT_VEHICLES.map((v) => [v]));
    lists.getRange(2, 2, DEFAULT_CATEGORIES.length, 1).setValues(DEFAULT_CATEGORIES.map((v) => [v]));
  }
  if (readme.getLastRow() < 2) {
    const lines = [
      'This workbook is filled in by the Gifted Motors website. Staff never need to open it.',
      'Hires: one row per booking. "Paid so far" and "Balance" update by themselves from the Payments log.',
      'Payments log: every payment ever made, with who entered it and when.',
      'Expenses: every expense, with who entered it and when.',
      'Lists: type a new vehicle or expense category at the bottom of its column and it appears on the website.',
      'Booking requests: enquiries sent from the public website. Change the Status column (New, Confirmed, Declined) as you deal with them.',
      'Reviews: reviews sent from the website. New ones show as Pending. Approve them on the Manager page of the staff portal (or change Status to Approved here) and they appear on the website.',
      'Monthly reports: a saved copy of each month\'s figures, added automatically on the 1st of every month.',
      'Please do not edit or delete rows in Hires, Payments log or Expenses. Ask for help if something was entered wrongly.'
    ];
    readme.getRange(2, 1, lines.length, 1).setValues(lines.map((l) => [l]));
    readme.setColumnWidth(1, 700);
  }

  [hires, pays, exp, reports].forEach((sh) => {
    const already = sh.getProtections(SpreadsheetApp.ProtectionType.SHEET);
    if (!already.length) sh.protect().setWarningOnly(true);
  });

  const blank = ss.getSheetByName('Sheet1');
  if (blank && ss.getSheets().length > 1 && blank.getLastRow() === 0) ss.deleteSheet(blank);

  ScriptApp.getProjectTriggers().forEach((t) => { if (t.getHandlerFunction() === 'monthlyTrigger_') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('monthlyTrigger_').timeBased().onMonthDay(1).atHour(2).create();
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Gifted Motors').addItem("Save last month's report now", 'captureLastMonthNow').addToUi();
}

// ============================================================================
// Web address handlers
// ============================================================================

function doGet() {
  return ContentService.createTextOutput('The Gifted Motors records system is running.');
}

function doPost(e) {
  let out;
  try {
    const req = JSON.parse(e.postData.contents);
    out = handle_(req);
  } catch (err) {
    out = { ok: false, error: err.userMessage || 'Something went wrong on our side. Please try again.', code: err.code || 'server' };
    if (!err.userMessage) console.error(err && err.stack ? err.stack : err);
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function handle_(req) {
  const action = String(req.action || '');
  if (action === 'login') return login_(req);
  if (action === 'bookingRequest') return once_(req, () => bookingRequest_(req));
  if (action === 'reviewSubmit') return once_(req, () => reviewSubmit_(req));
  if (action === 'publicReviews') return publicReviews_();
  if (action === 'publicLists') { const l = readLists_(); return { ok: true, vehicles: l.vehicles }; }
  const sess = session_(req.token);
  switch (action) {
    case 'managerLogin': return managerLogin_(req, sess);
    case 'listReviews': requireManager_(sess); return listReviews_();
    case 'setReview': requireManager_(sess); return once_(req, () => setReview_(sess, req));
    case 'staffData': return staffData_(sess);
    case 'getAll': requireManager_(sess); return getAll_(sess);
    case 'addHire': return once_(req, () => addHire_(sess, req));
    case 'addPayment': return once_(req, () => addPayment_(sess, req));
    case 'addExpense': return once_(req, () => addExpense_(sess, req));
    default: fail_('That request is not recognised.', 'invalid');
  }
}

// ============================================================================
// Sign in and sessions
// ============================================================================

function tooManyTries_() {
  const cache = CacheService.getScriptCache();
  return Number(cache.get('fails') || 0) >= 10;
}
function recordFail_() {
  const cache = CacheService.getScriptCache();
  cache.put('fails', String(Number(cache.get('fails') || 0) + 1), 600);
}

function login_(req) {
  if (tooManyTries_()) fail_('Too many wrong passwords. Please wait 10 minutes and try again.', 'locked');
  const name = String(req.name || '').replace(/\s+/g, ' ').trim();
  if (name.length < 2 || name.length > 60) fail_('Please type your name so we know who is recording.', 'invalid');
  if (String(req.password || '') !== STAFF_PASSWORD) { recordFail_(); fail_('That password is not right. Please try again or ask the manager.', 'password'); }
  const token = Utilities.getUuid() + Utilities.getUuid();
  CacheService.getScriptCache().put('tok:' + token, JSON.stringify({ name: name, mgr: false }), SESSION_SECONDS);
  const lists = readLists_();
  return { ok: true, token: token, name: name, vehicles: lists.vehicles, categories: lists.categories };
}

function session_(token) {
  const t = String(token || '');
  const cache = CacheService.getScriptCache();
  const raw = t.length > 20 ? cache.get('tok:' + t) : null;
  if (!raw) fail_('Your session has ended. Please sign in again.', 'auth');
  cache.put('tok:' + t, raw, SESSION_SECONDS); // keep an active session alive
  const s = JSON.parse(raw);
  s.token = t;
  return s;
}

function managerLogin_(req, sess) {
  if (tooManyTries_()) fail_('Too many wrong passwords. Please wait 10 minutes and try again.', 'locked');
  if (String(req.password || '') !== MANAGER_PASSWORD) { recordFail_(); fail_('That password is not right.', 'password'); }
  CacheService.getScriptCache().put('tok:' + sess.token, JSON.stringify({ name: sess.name, mgr: true }), SESSION_SECONDS);
  return { ok: true };
}

function requireManager_(sess) {
  if (!sess.mgr) fail_('This part is for managers. Please enter the manager password.', 'manager');
}

// ============================================================================
// Reading the sheets
// ============================================================================

function tz_() { return Session.getScriptTimeZone(); }
function iso_(v) { return v instanceof Date ? Utilities.formatDate(v, tz_(), 'yyyy-MM-dd') : String(v || '').slice(0, 10); }
function ts_(v) { return v instanceof Date ? v.toISOString() : String(v || ''); }
function round2_(n) { return Math.round(n * 100) / 100; }
function unique_(a) { return a.filter((x, i) => x && a.indexOf(x) === i); }

function sheet_(name) {
  const sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) fail_('The sheet "' + name + '" is missing. Please run setup again.', 'server');
  return sh;
}
function rows_(name, ncols) {
  const sh = sheet_(name);
  const n = sh.getLastRow() - 1;
  return n < 1 ? [] : sh.getRange(2, 1, n, ncols).getValues();
}

function readLists_() {
  const sh = sheet_(SHEET.lists);
  const n = sh.getLastRow() - 1;
  if (n < 1) return { vehicles: [], categories: [] };
  const v = sh.getRange(2, 1, n, 2).getValues();
  return {
    vehicles: unique_(v.map((r) => String(r[0]).trim())),
    categories: unique_(v.map((r) => String(r[1]).trim()))
  };
}

function readHires_() {
  return rows_(SHEET.hires, 15).filter((r) => r[0]).map((r) => ({
    id: String(r[0]), date: iso_(r[1]), customer: String(r[2]), phone: String(r[3]), vehicle: String(r[4]), reg: String(r[5]),
    rate: Number(r[6]), days: Number(r[7]), prepaid: String(r[11]) === 'Yes', startDate: iso_(r[12]) || iso_(r[1]),
    by: String(r[13]), ts: ts_(r[14])
  }));
}
function readPayments_() {
  return rows_(SHEET.pays, 7).filter((r) => r[0]).map((r) => ({
    id: String(r[0]), date: iso_(r[1]), customer: String(r[2]), type: String(r[3]), amount: Number(r[4]) || 0, by: String(r[5]), ts: ts_(r[6])
  }));
}
function readExpenses_() {
  return rows_(SHEET.exp, 9).filter((r) => r[0]).map((r) => ({
    id: String(r[0]), date: iso_(r[1]), what: String(r[2]), category: String(r[3]), vehicle: String(r[4]), reg: String(r[5]),
    amount: Number(r[6]) || 0, by: String(r[7]), ts: ts_(r[8])
  }));
}

function fullHires_() {
  const pays = readPayments_();
  return readHires_().map((h) => {
    h.payments = pays.filter((p) => p.id === h.id).map((p) => ({ ts: p.ts, date: p.date, amount: p.amount, by: p.by }));
    return h;
  });
}
function paid_(h) { return h.payments.reduce((a, p) => a + p.amount, 0); }
function balance_(h) { return round2_(h.rate * h.days - paid_(h)); }
function byTsDesc_(a, b) { return String(b.ts).localeCompare(String(a.ts)); }

function extras_(sess, hires, exps) {
  const regs = [];
  hires.forEach((h) => { if (h.reg) regs.push({ vehicle: h.vehicle, reg: h.reg }); });
  exps.forEach((x) => { if (x.reg) regs.push({ vehicle: x.vehicle, reg: x.reg }); });
  const seen = {};
  return {
    regs: regs.filter((r) => { const k = r.vehicle + '|' + r.reg; if (seen[k]) return false; seen[k] = true; return true; }),
    recentHires: hires.filter((h) => h.by === sess.name).sort(byTsDesc_).slice(0, 3),
    recentExpenses: exps.filter((x) => x.by === sess.name).sort(byTsDesc_).slice(0, 3)
  };
}

function staffData_(sess) {
  const lists = readLists_();
  const hires = fullHires_();
  const exps = readExpenses_();
  const x = extras_(sess, hires, exps);
  return {
    ok: true, vehicles: lists.vehicles, categories: lists.categories,
    income: hires.filter((h) => balance_(h) > 0.005), expense: [],
    regs: x.regs, recentHires: x.recentHires, recentExpenses: x.recentExpenses
  };
}

function getAll_(sess) {
  const lists = readLists_();
  const hires = fullHires_();
  const exps = readExpenses_();
  const x = extras_(sess, hires, exps);
  return {
    ok: true, vehicles: lists.vehicles, categories: lists.categories,
    income: hires, expense: exps,
    regs: x.regs, recentHires: x.recentHires, recentExpenses: x.recentExpenses
  };
}

// ============================================================================
// Writing
// ============================================================================

function fail_(msg, code) {
  const e = new Error(msg);
  e.userMessage = msg;
  e.code = code || 'invalid';
  throw e;
}

function locked_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try { return fn(); } finally { lock.releaseLock(); }
}

// Runs once per clientId, so a retry after a bad connection cannot save the same entry twice.
function once_(req, fn) {
  return locked_(() => {
    const cache = CacheService.getScriptCache();
    const key = req.clientId ? 'req:' + String(req.clientId).slice(0, 64) : null;
    if (key) { const hit = cache.get(key); if (hit) return JSON.parse(hit); }
    const out = fn();
    if (key) cache.put(key, JSON.stringify(out), 21600);
    return out;
  });
}

function parseDate_(s, label) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) fail_('Please check the ' + label + '.');
  const y = +m[1];
  if (y < 2020 || y > 2100) fail_('Please check the ' + label + '.');
  return new Date(y, +m[2] - 1, +m[3], 12, 0, 0);
}
function text_(v, label, min, max) {
  const s = String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  if (s.length < min || s.length > max) fail_('Please check the ' + label + '.');
  return s;
}
function num_(v, label, min, max) {
  const n = Number(v);
  if (v === '' || v == null || !isFinite(n) || n < min || n > max) fail_('Please check the ' + label + '.');
  return round2_(n);
}
function reg_(v) {
  const r = String(v || '').toUpperCase().replace(/\s+/g, ' ').trim();
  if (!/^[A-Z0-9][A-Z0-9 -]{2,11}$/.test(r)) fail_('Please check the registration number (number plate).');
  return r;
}
function phone_(v) {
  const p = String(v || '').trim();
  if (!/^[+0-9 ()-]+$/.test(p) || (p.match(/\d/g) || []).length < 7) fail_('Please check the customer phone number.');
  return p;
}
function nextNumber_(sh, prefix) {
  const n = sh.getLastRow() - 1;
  let max = 0;
  if (n > 0) sh.getRange(2, 1, n, 1).getValues().forEach((r) => { const d = parseInt(String(r[0]).replace(/\D/g, ''), 10); if (d > max) max = d; });
  return prefix + '-' + String(max + 1).padStart(4, '0');
}

function addHire_(sess, req) {
  const h = req.hire || {};
  const lists = readLists_();
  const date = parseDate_(h.date, 'date');
  const customer = text_(h.customer, 'customer name', 2, 80);
  const phone = phone_(h.phone);
  const vehicle = String(h.vehicle || '');
  if (lists.vehicles.indexOf(vehicle) < 0) fail_('Please choose a vehicle from the list.');
  const reg = reg_(h.reg);
  const rate = num_(h.rate, 'daily rate', 0.01, 10000000);
  const days = num_(h.days, 'number of days', 1, 3650);
  const paid = num_(h.paid, 'amount paid', 0, 1000000000);
  const prepaid = h.prepaid === true;
  let start = date;
  if (prepaid) {
    start = parseDate_(h.startDate, 'hire start date');
    if (start < date) fail_('The hire cannot start before the day it was paid for.');
    if (!(paid > 0)) fail_('A prepayment needs an amount paid.');
  }
  const hs = sheet_(SHEET.hires), ps = sheet_(SHEET.pays);
  const id = nextNumber_(hs, BOOKING_PREFIX);
  const now = new Date();
  const r = hs.getLastRow() + 1;
  hs.getRange(r, 1, 1, 15).setValues([[
    id, date, customer, phone, vehicle, reg, rate, days,
    '=G' + r + '*H' + r,
    "=SUMIF('" + SHEET.pays + "'!$A:$A,A" + r + ",'" + SHEET.pays + "'!$E:$E)",
    '=I' + r + '-J' + r,
    prepaid ? 'Yes' : 'No', start, sess.name, now
  ]]);
  const pr = ps.getLastRow() + 1;
  ps.getRange(pr, 1, 1, 7).setValues([[id, date, customer, prepaid ? 'Prepayment' : 'New hire', paid, sess.name, now]]);
  return { ok: true, id: id, balance: round2_(rate * days - paid) };
}

function addPayment_(sess, req) {
  const p = req.payment || {};
  const date = parseDate_(p.date, 'date');
  const amount = num_(p.amount, 'amount', 0.01, 1000000000);
  const hire = fullHires_().filter((h) => h.id === String(p.id || ''))[0];
  if (!hire) fail_('That booking could not be found. Please choose it again.');
  const owed = balance_(hire);
  if (owed <= 0.005) fail_('That booking is already paid in full.');
  if (amount > owed + 0.005) fail_('That is more than the K ' + owed.toFixed(2) + ' still owed. Please check the amount.');
  const ps = sheet_(SHEET.pays);
  ps.getRange(ps.getLastRow() + 1, 1, 1, 7).setValues([[hire.id, date, hire.customer, 'Balance payment', amount, sess.name, new Date()]]);
  return { ok: true, id: hire.id, customer: hire.customer, balance: round2_(owed - amount) };
}

function addExpense_(sess, req) {
  const x = req.expense || {};
  const lists = readLists_();
  const date = parseDate_(x.date, 'date');
  const what = text_(x.what, 'description', 2, 120);
  const category = String(x.category || '');
  if (lists.categories.indexOf(category) < 0) fail_('Please choose a category from the list.');
  let vehicle = String(x.vehicle || ''), reg = '';
  if (vehicle) {
    if (lists.vehicles.indexOf(vehicle) < 0) fail_('Please choose a vehicle from the list.');
    reg = reg_(x.reg);
  }
  const amount = num_(x.amount, 'amount', 0.01, 1000000000);
  const es = sheet_(SHEET.exp);
  const id = nextNumber_(es, 'EX');
  es.getRange(es.getLastRow() + 1, 1, 1, 9).setValues([[id, date, what, category, vehicle, reg, amount, sess.name, new Date()]]);
  return { ok: true, id: id };
}

// ============================================================================
// Public booking requests (from the customer website, no sign-in)
// ============================================================================

function bookingRequest_(req) {
  const b = req.booking || {};
  if (String(b.website || '') !== '') fail_('Thank you.', 'invalid'); // hidden box that only robots fill in
  const cache = CacheService.getScriptCache();
  const hits = Number(cache.get('reqs') || 0);
  if (hits >= 40) fail_('We are receiving a lot of requests right now. Please call us instead.', 'busy');
  const name = text_(b.name, 'name', 2, 80);
  const phone = phone_(b.phone);
  const email = String(b.email || '').trim();
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail_('Please check the email address.');
  const lists = readLists_();
  const vehicle = String(b.vehicle || '');
  if (lists.vehicles.indexOf(vehicle) < 0) fail_('Please choose a vehicle from the list.');
  const from = parseDate_(b.from, 'pick-up date');
  const to = parseDate_(b.to, 'return date');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (from < today) fail_('The pick-up date cannot be in the past.');
  if (to < from) fail_('The return date cannot be before the pick-up date.');
  const days = Math.round((to - from) / 86400000) + 1;
  if (days > 365) fail_('Please check the dates.');
  const place = text_(b.place, 'pick-up place', 2, 120);
  const driver = ['Self-drive', 'With a driver', 'Not sure'].indexOf(b.driver) >= 0 ? b.driver : 'Not sure';
  const pay = ['Airtel Money', 'Pay before collecting the vehicle', 'Not sure yet'].indexOf(b.pay) >= 0 ? b.pay : 'Not sure yet';
  const notes = String(b.notes || '').replace(/\s+/g, ' ').trim().slice(0, 400);
  const sh = sheet_(SHEET.requests);
  const id = nextNumber_(sh, 'BR');
  sh.getRange(sh.getLastRow() + 1, 1, 1, 14).setValues([[id, new Date(), 'New', name, phone, email, vehicle, from, to, days, place, driver, pay, notes]]);
  cache.put('reqs', String(hits + 1), 3600);
  if (NOTIFY_EMAIL) {
    try {
      MailApp.sendEmail(NOTIFY_EMAIL, 'New booking request ' + id + ' from ' + name,
        id + '\n' + name + ' · ' + phone + '\n' + vehicle + '\n' + days + ' day(s): ' + Utilities.formatDate(from, tz_(), 'dd MMM yyyy') + ' to ' + Utilities.formatDate(to, tz_(), 'dd MMM yyyy') +
        '\nPick-up: ' + place + '\nDriver: ' + driver + '\nPayment: ' + pay + (notes ? '\nNotes: ' + notes : ''));
    } catch (e) { /* the request is saved; the email is a bonus */ }
  }
  return { ok: true, id: id, days: days };
}

// ============================================================================
// Customer reviews: sent from the website, shown only after the manager approves them
// ============================================================================

function reviewSubmit_(req) {
  const r = req.review || {};
  if (String(r.website || '') !== '') fail_('Thank you.', 'invalid'); // hidden box that only robots fill in
  const cache = CacheService.getScriptCache();
  const hits = Number(cache.get('revs') || 0);
  if (hits >= 20) fail_('We are receiving a lot of reviews right now. Please try again later.', 'busy');
  const name = text_(r.name, 'name', 2, 60);
  const rating = Math.round(num_(r.rating, 'star rating', 1, 5));
  const about = ['Car hire', 'Import and clearance', 'Buying a car', 'Selling a car', 'Something else'].indexOf(r.about) >= 0 ? r.about : 'Something else';
  const said = text_(r.text, 'review', 10, 600);
  if (/https?:\/\/|www\./i.test(said)) fail_('Please leave web links out of your review.');
  const sh = sheet_(SHEET.reviews);
  const id = nextNumber_(sh, 'RV');
  sh.getRange(sh.getLastRow() + 1, 1, 1, 8).setValues([[id, new Date(), 'Pending', name, rating, about, said, '']]);
  cache.put('revs', String(hits + 1), 3600);
  if (NOTIFY_EMAIL) {
    try { MailApp.sendEmail(NOTIFY_EMAIL, 'New review to approve: ' + id, name + ' gave ' + rating + ' out of 5.\n\n' + said + '\n\nOpen the Manager page on the staff portal to approve or reject it.'); } catch (e) { /* saved anyway */ }
  }
  return { ok: true, id: id };
}

function readReviews_() {
  return rows_(SHEET.reviews, 8).map((r, i) => ({ row: i + 2, id: String(r[0]), ts: ts_(r[1]), status: String(r[2] || 'Pending'), name: String(r[3]), rating: Number(r[4]) || 0, about: String(r[5]), text: String(r[6]) })).filter((r) => r.id);
}

function publicReviews_() {
  const list = readReviews_().filter((r) => r.status === 'Approved').sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 50)
    .map((r) => ({ name: r.name, rating: r.rating, about: r.about, text: r.text, date: r.ts.slice(0, 10) }));
  return { ok: true, reviews: list };
}

function listReviews_() {
  const all = readReviews_().sort((a, b) => b.ts.localeCompare(a.ts));
  return { ok: true, pending: all.filter((r) => r.status === 'Pending'), approved: all.filter((r) => r.status === 'Approved').length, rejected: all.filter((r) => r.status === 'Rejected').length };
}

function setReview_(sess, req) {
  const status = ['Approved', 'Rejected', 'Pending'].indexOf(req.status) >= 0 ? req.status : '';
  if (!status) fail_('Please choose Approve or Reject.');
  const hit = readReviews_().filter((r) => r.id === String(req.id))[0];
  if (!hit) fail_('That review could not be found. Please refresh.');
  const sh = sheet_(SHEET.reviews);
  sh.getRange(hit.row, 3, 1, 1).setValues([[status]]);
  sh.getRange(hit.row, 8, 1, 1).setValues([[new Date()]]);
  return { ok: true, id: hit.id, status: status };
}

// ============================================================================
// Monthly saved report
// ============================================================================

function monthlyTrigger_() { saveMonth_(null); }
function captureLastMonthNow() { saveMonth_(null); SpreadsheetApp.getActive().toast("Last month's report has been saved on the Monthly reports tab."); }

function saveMonth_(monthKey) {
  const now = new Date();
  const key = monthKey || Utilities.formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1), tz_(), 'yyyy-MM');
  const pays = readPayments_(), exps = readExpenses_(), hires = fullHires_();
  const todayIso = Utilities.formatDate(now, tz_(), 'yyyy-MM-dd');
  const sum = (a, f) => a.reduce((t, x) => t + f(x), 0);
  const inn = sum(pays.filter((p) => p.date.slice(0, 7) === key), (p) => p.amount);
  const out = sum(exps.filter((x) => x.date.slice(0, 7) === key), (x) => x.amount);
  const owed = sum(hires.filter((h) => balance_(h) > 0.005), (h) => balance_(h));
  const held = sum(hires.filter((h) => h.prepaid && h.startDate >= todayIso), (h) => paid_(h));
  const row = [key, round2_(inn), round2_(out), round2_(inn - out), hires.filter((h) => h.date.slice(0, 7) === key).length, round2_(owed), round2_(held), now];
  const sh = sheet_(SHEET.reports);
  const n = sh.getLastRow() - 1;
  let at = 0;
  if (n > 0) sh.getRange(2, 1, n, 1).getValues().forEach((r, i) => { if (String(r[0]) === key) at = i + 2; });
  sh.getRange(at || sh.getLastRow() + 1, 1, 1, 8).setValues([row]);
}
