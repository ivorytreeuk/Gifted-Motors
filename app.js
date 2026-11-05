/* Gifted Motors Records Portal - DEMO VERSION
   Nothing here is sent anywhere yet. Entries are kept only in this browser so the client can try it.
   In the live version, Google Sheets + a Google Apps Script will replace the demo storage and passwords. */

// ---- Things the client can change easily -------------------------------
const VEHICLES = [
  'Toyota Land Cruiser Prado',
  'Toyota Hilux',
  'Honda Fit',
  'Toyota Hiace van',
  'Toyota Alphard / Vellfire'
];
const CATEGORIES = ['Fuel', 'Mechanic and repairs', 'Drivers', 'Marketing', 'Salaries', 'Other'];
const DEMO_PASSWORDS = { staff: 'staff', manager: 'manager' };
// -------------------------------------------------------------------------

const app = document.getElementById('app');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => 'K ' + (Number(n) || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const fmtDT = (iso) => { try { return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return iso; } };

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)) || []; } catch (e) { return []; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const sess = {
  get() { try { return JSON.parse(sessionStorage.getItem('gm_session')); } catch (e) { return null; } },
  set(v) { try { sessionStorage.setItem('gm_session', JSON.stringify(v)); } catch (e) {} }
};

let session = sess.get();
let view = 'income';
let managerOK = false;
let period = 'month';

function header() {
  return `<div class="demo">Demo version: entries stay on this device and are not sent to Google Sheets yet.</div>
  <header class="top"><div class="top-in">
    <img src="logo.png" alt="Gifted Motors">
    <nav class="tabs" aria-label="Pages">
      <button class="tab ${view === 'income' ? 'on' : ''}" data-go="income">Money in</button>
      <button class="tab ${view === 'expense' ? 'on' : ''}" data-go="expense">Money out</button>
      <button class="tab ${view === 'overview' ? 'on' : ''}" data-go="overview">Overview</button>
    </nav>
    <div class="who">Signed in as <b>${esc(session.name)}</b> <button class="linkbtn" id="signout">Sign out</button></div>
  </div></header>`;
}

function signIn(errMsg) {
  app.innerHTML = `<main class="signin">
    <div class="hero"><img src="logo.png" alt="Gifted Motors"><div>Staff records portal</div></div>
    <form class="sheet" id="signinform" novalidate>
      <div><h1>Sign in</h1><p class="lead">Two quick boxes, then you can start recording.</p></div>
      ${errMsg ? `<div class="errbox" role="alert">${esc(errMsg)}</div>` : ''}
      <div class="field"><label for="nm">Your name</label>
        <input id="nm" type="text" autocomplete="name" placeholder="First and last name">
        <div class="help">Your name is saved with everything you record, so the manager can see who entered what.</div></div>
      <div class="field"><label for="pw">Staff password</label>
        <input id="pw" type="password" placeholder="Type the password">
        <div class="help">Ask the manager if you do not know it. Please do not share it outside the business.</div></div>
      <button class="btn" type="submit">Sign in</button>
      <div class="help">Demo only: the staff password is <b>staff</b> and the manager password is <b>manager</b>.</div>
    </form></main>`;
  document.getElementById('signinform').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('nm').value.trim();
    const pw = document.getElementById('pw').value;
    if (name.length < 2) return signIn('Please type your name so we know who is recording.');
    if (pw !== DEMO_PASSWORDS.staff) return signIn('That password is not right. Please try again or ask the manager.');
    session = { name };
    sess.set(session);
    view = 'income';
    render();
  });
}

function wire() {
  document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => { view = b.dataset.go; render(); }));
  const so = document.getElementById('signout');
  if (so) so.addEventListener('click', () => { session = null; managerOK = false; sess.set(null); render(); });
}

function field(id, label, help, control, err) {
  return `<div class="field ${err ? 'bad' : ''}"><label for="${id}">${label}</label>${control}${err ? `<div class="err" role="alert">${esc(err)}</div>` : ''}<div class="help">${help}</div></div>`;
}

function recent(kind) {
  const rows = store.get(kind).slice(-3).reverse();
  if (!rows.length) return '<div class="empty">Nothing recorded yet on this device.</div>';
  return rows.map((r) => kind === 'gm_income'
    ? `<div class="mini"><div>${esc(r.customer)}<small>${esc(r.vehicle)} · ${esc(r.date)}</small></div><b>${money(r.paid)}</b></div>`
    : `<div class="mini"><div>${esc(r.what)}<small>${esc(r.category)} · ${esc(r.date)}</small></div><b>${money(r.amount)}</b></div>`).join('');
}

function incomeView(state) {
  state = state || { date: today(), customer: '', vehicle: '', rate: '', days: '', paid: '' };
  const e = state.errors || {};
  const vehOpts = ['<option value="">Choose a vehicle</option>'].concat(VEHICLES.map((v) => `<option ${state.vehicle === v ? 'selected' : ''}>${esc(v)}</option>`)).join('');
  app.innerHTML = header() + `<main class="page">
    <div><h1>Record money coming in</h1><p class="lead">Use this each time a customer hires a vehicle. One entry per hire.</p></div>
    <div class="grid">
      <form class="card form" id="f" novalidate>
        <div class="row2">
          ${field('date', 'Date', 'The day the customer paid or took the vehicle.', `<input id="date" type="date" value="${esc(state.date)}">`, e.date)}
          ${field('customer', 'Customer name', 'Who is paying. Spell it the same way every time.', `<input id="customer" type="text" placeholder="First and last name" value="${esc(state.customer)}">`, e.customer)}
        </div>
        ${field('vehicle', 'Vehicle', 'Which vehicle they hired.', `<select id="vehicle">${vehOpts}</select>`, e.vehicle)}
        <div class="row3">
          ${field('rate', 'Daily rate (K)', 'What it costs to hire this vehicle for one day, in Kwacha.', `<input id="rate" type="number" inputmode="decimal" min="0" value="${esc(state.rate)}">`, e.rate)}
          ${field('days', 'Days hired', 'How many days in total.', `<input id="days" type="number" inputmode="numeric" min="1" value="${esc(state.days)}">`, e.days)}
          ${field('paid', 'Amount paid (K)', 'The money you are receiving now, even if only part of the total.', `<input id="paid" type="number" inputmode="decimal" min="0" value="${esc(state.paid)}">`, e.paid)}
        </div>
        <div class="balance"><div class="l">Balance still owed</div><div class="v" id="bal">K 0.00</div><div class="n">Worked out for you: rate × days, minus amount paid. You do not type this.</div></div>
        <div class="stamp">This entry will be saved under your name, <b>${esc(session.name)}</b>, with today's date and time.</div>
        ${state.saved ? '<div class="ok" role="status">Saved. Thank you, your entry is recorded.</div>' : ''}
        <button class="btn" type="submit">Save</button>
      </form>
      <aside class="side">
        <div class="card"><h2>Quick guide</h2><p>Fill the boxes from top to bottom. Every box needs an answer. Check the balance looks right, then press Save. A green message confirms it worked.</p><p>Made a mistake after saving? Tell the manager. Please do not enter it twice.</p></div>
        <div class="card" style="margin-top:20px"><h2>Your latest entries</h2>${recent('gm_income')}</div>
      </aside>
    </div></main>`;
  wire();
  const f = document.getElementById('f');
  const val = (id) => document.getElementById(id).value;
  const calc = () => {
    const bal = (parseFloat(val('rate')) || 0) * (parseFloat(val('days')) || 0) - (parseFloat(val('paid')) || 0);
    document.getElementById('bal').textContent = money(bal);
  };
  ['rate', 'days', 'paid'].forEach((id) => document.getElementById(id).addEventListener('input', calc));
  calc();
  f.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const s = { date: val('date'), customer: val('customer').trim(), vehicle: val('vehicle'), rate: val('rate'), days: val('days'), paid: val('paid') };
    const errors = {};
    if (!s.date) errors.date = 'Please pick the date.';
    if (s.customer.length < 2) errors.customer = 'Please type the customer name.';
    if (!s.vehicle) errors.vehicle = 'Please choose a vehicle.';
    if (!(parseFloat(s.rate) > 0)) errors.rate = 'Please type the daily rate, for example 500.';
    if (!(parseFloat(s.days) >= 1)) errors.days = 'Please type how many days.';
    if (s.paid === '' || !(parseFloat(s.paid) >= 0)) errors.paid = 'Please type the amount paid. Type 0 if nothing was paid.';
    if (Object.keys(errors).length) return incomeView({ ...s, errors });
    const rate = parseFloat(s.rate), days = parseFloat(s.days), paid = parseFloat(s.paid);
    const rows = store.get('gm_income');
    rows.push({ ts: new Date().toISOString(), date: s.date, customer: s.customer, vehicle: s.vehicle, rate, days, paid, balance: rate * days - paid, by: session.name });
    store.set('gm_income', rows);
    incomeView({ date: today(), customer: '', vehicle: '', rate: '', days: '', paid: '', saved: true });
  });
}

function expenseView(state) {
  state = state || { date: today(), what: '', category: '', amount: '' };
  const e = state.errors || {};
  const catOpts = ['<option value="">Choose a category</option>'].concat(CATEGORIES.map((c) => `<option ${state.category === c ? 'selected' : ''}>${esc(c)}</option>`)).join('');
  app.innerHTML = header() + `<main class="page">
    <div><h1>Record money going out</h1><p class="lead">Use this for anything the business pays for: fuel, repairs, drivers, marketing, salaries. One entry per receipt.</p></div>
    <div class="grid">
      <form class="card form" id="f" novalidate>
        ${field('date', 'Date', 'The day you paid. It is on the receipt.', `<input id="date" type="date" value="${esc(state.date)}">`, e.date)}
        ${field('what', 'What was it for?', 'A few words so anyone reading the sheet knows what this payment was.', `<input id="what" type="text" placeholder="e.g. Fuel for the Prado" value="${esc(state.what)}">`, e.what)}
        <div class="row2">
          ${field('category', 'Category', 'Pick the closest one. Not sure? Choose Other.', `<select id="category">${catOpts}</select>`, e.category)}
          ${field('amount', 'Amount (K)', 'The total on the receipt, in Kwacha. Numbers only.', `<input id="amount" type="number" inputmode="decimal" min="0" placeholder="0.00" value="${esc(state.amount)}">`, e.amount)}
        </div>
        <div class="stamp">This entry will be saved under your name, <b>${esc(session.name)}</b>, with today's date and time.</div>
        ${state.saved ? '<div class="ok" role="status">Saved. Thank you, your expense is recorded.</div>' : ''}
        <button class="btn" type="submit">Save</button>
      </form>
      <aside class="side">
        <div class="card"><h2>Quick guide</h2><p>Keep the receipt until you see the green Saved message.</p></div>
        <div class="card" style="margin-top:20px"><h2>Your latest entries</h2>${recent('gm_expense')}</div>
      </aside>
    </div></main>`;
  wire();
  const val = (id) => document.getElementById(id).value;
  document.getElementById('f').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const s = { date: val('date'), what: val('what').trim(), category: val('category'), amount: val('amount') };
    const errors = {};
    if (!s.date) errors.date = 'Please pick the date.';
    if (s.what.length < 2) errors.what = 'Please say what it was for.';
    if (!s.category) errors.category = 'Please choose a category.';
    if (!(parseFloat(s.amount) > 0)) errors.amount = 'Please type the amount, for example 250.';
    if (Object.keys(errors).length) return expenseView({ ...s, errors });
    const rows = store.get('gm_expense');
    rows.push({ ts: new Date().toISOString(), date: s.date, what: s.what, category: s.category, amount: parseFloat(s.amount), by: session.name });
    store.set('gm_expense', rows);
    expenseView({ date: today(), what: '', category: '', amount: '', saved: true });
  });
}

function inPeriod(dateStr) {
  if (period === 'all') return true;
  const d = new Date(dateStr + 'T00:00:00'), n = new Date();
  if (period === 'month') return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
  if (period === '3months') { const c = new Date(n); c.setMonth(c.getMonth() - 3); return d >= c; }
  if (period === 'year') return d.getFullYear() === n.getFullYear();
  return true;
}

function bars(map, cls) {
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return '<div class="empty">No entries in this period yet.</div>';
  const max = entries[0][1] || 1;
  return entries.map(([k, v]) => `<div class="bar ${cls}"><div class="t"><span>${esc(k)}</span><b>${money(v)}</b></div><div class="b"><i style="width:${Math.max(3, (v / max) * 100)}%"></i></div></div>`).join('');
}

function overviewView(errMsg) {
  if (!managerOK) {
    app.innerHTML = header() + `<main class="page"><div class="card form" style="max-width:480px">
      <div><h1>Manager overview</h1><p class="lead">This page needs the manager password.</p></div>
      ${errMsg ? `<div class="errbox" role="alert">${esc(errMsg)}</div>` : ''}
      <form class="form" id="mf" novalidate>
        <div class="field"><label for="mpw">Manager password</label><input id="mpw" type="password" placeholder="Type the manager password"><div class="help">Demo only: the manager password is <b>manager</b>.</div></div>
        <button class="btn" type="submit">Open overview</button>
      </form></div></main>`;
    wire();
    document.getElementById('mf').addEventListener('submit', (ev) => {
      ev.preventDefault();
      if (document.getElementById('mpw').value === DEMO_PASSWORDS.manager) { managerOK = true; overviewView(); }
      else overviewView('That password is not right.');
    });
    return;
  }
  const inc = store.get('gm_income').filter((r) => inPeriod(r.date));
  const exp = store.get('gm_expense').filter((r) => inPeriod(r.date));
  const tin = inc.reduce((a, r) => a + r.paid, 0);
  const tout = exp.reduce((a, r) => a + r.amount, 0);
  const owed = inc.reduce((a, r) => a + Math.max(0, r.balance), 0);
  const byCat = {}; exp.forEach((r) => { byCat[r.category] = (byCat[r.category] || 0) + r.amount; });
  const byVeh = {}; inc.forEach((r) => { byVeh[r.vehicle] = (byVeh[r.vehicle] || 0) + r.paid; });
  const owing = inc.filter((r) => r.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 6);
  const latest = [].concat(inc.map((r) => ({ ...r, type: 'Income' })), exp.map((r) => ({ ...r, type: 'Expense' }))).sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, 12);
  const opt = (v, l) => `<option value="${v}" ${period === v ? 'selected' : ''}>${l}</option>`;
  app.innerHTML = header() + `<main class="page">
    <div class="toolbar"><div><h1>Business overview</h1><p class="lead">A summary of the income and expense records. Manager view.</p></div>
      <div class="field"><label for="per" style="font-size:14px">Showing</label><select id="per">${opt('month', 'This month')}${opt('3months', 'Last 3 months')}${opt('year', 'This year')}${opt('all', 'All time')}</select></div></div>
    <div class="stats">
      <div class="stat"><div class="l">Money in</div><div class="v">${money(tin)}</div></div>
      <div class="stat"><div class="l">Money out</div><div class="v">${money(tout)}</div></div>
      <div class="stat dark"><div class="l">Profit</div><div class="v">${money(tin - tout)}</div></div>
      <div class="stat warn"><div class="l">Still owed to us</div><div class="v">${money(owed)}</div></div>
    </div>
    <div class="cols">
      <section class="card"><h2>Where the money goes</h2>${bars(byCat, 'y')}</section>
      <section class="card"><h2>Which vehicles earn most</h2>${bars(byVeh, '')}</section>
      <section class="card"><h2>Who owes us money</h2>${owing.length ? owing.map((r) => `<div class="mini"><div>${esc(r.customer)}<small>${esc(r.vehicle)} · ${esc(r.date)}</small></div><b>${money(r.balance)}</b></div>`).join('') : '<div class="empty">Nobody owes anything in this period.</div>'}</section>
    </div>
    <section class="card"><h2>Latest entries and who recorded them</h2><div class="help" style="margin-bottom:10px">Every entry carries the staff member's name and a time stamp.</div>
      ${latest.length ? `<div class="tablewrap"><table><thead><tr><th>Date and time</th><th>Type</th><th>Details</th><th class="r">Amount</th><th>Entered by</th></tr></thead><tbody>${latest.map((r) => `<tr><td>${esc(fmtDT(r.ts))}</td><td><span class="pill ${r.type === 'Expense' ? 'out' : ''}">${r.type}</span></td><td>${r.type === 'Income' ? esc(r.customer) + ' · ' + esc(r.vehicle) : esc(r.what) + ' · ' + esc(r.category)}</td><td class="r"><b>${money(r.type === 'Income' ? r.paid : r.amount)}</b></td><td><b>${esc(r.by)}</b></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Nothing recorded yet. Add an entry on the Money in or Money out page and it will show here.</div>'}
    </section>
    <div><button class="btn small ghost" id="clear">Clear demo entries</button></div>
  </main>`;
  wire();
  document.getElementById('per').addEventListener('change', (ev) => { period = ev.target.value; overviewView(); });
  document.getElementById('clear').addEventListener('click', () => {
    if (confirm('Remove all demo entries from this device?')) { store.set('gm_income', []); store.set('gm_expense', []); overviewView(); }
  });
}

function render() {
  if (!session) return signIn();
  if (view === 'income') return incomeView();
  if (view === 'expense') return expenseView();
  return overviewView();
}
render();
