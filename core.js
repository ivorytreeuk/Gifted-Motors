/* Gifted Motors Records Portal - DEMO VERSION
   Nothing here is sent anywhere yet. Entries are kept only in this browser so the client can try it.
   In the live version, Google Sheets + a Google Apps Script will replace the demo storage and passwords.

   core.js = settings, helpers, data, charts. */

// ---- Things the client can change easily -------------------------------
const CONFIG = {
  business: 'Gifted Motors',
  legalName: '[Registered business name]',
  regNo: '[Company registration number]',
  address: '[Business address], Zambia',
  contact: '[Phone number / email]',
  preparedBy: '[Manager name]'
};
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

const PALETTE = ['#0E2A5B', '#F5B81C', '#3B6FD4', '#9DB8EA', '#B97A00', '#6B7A99', '#1F8A70', '#8A4B2A'];

const app = document.getElementById('app');
const $ = (id) => document.getElementById(id);
const qa = (sel) => Array.from(document.querySelectorAll(sel));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => { const v = Number(n) || 0; return (v < 0 ? '-K ' : 'K ') + Math.abs(v).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
const pct = (a, b) => (b ? (Math.round((a / b) * 1000) / 10).toFixed(1) + '%' : '0.0%');
const sum = (arr, f) => arr.reduce((a, x) => a + (f ? f(x) : x), 0);
const iso = (d) => { const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return x.toISOString().slice(0, 10); };
const today = () => iso(new Date());
const fmtD = (s) => { if (!s) return ''; const d = new Date(s + 'T00:00:00'); return isNaN(d) ? s : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); };
const fmtDT = (s) => { try { return new Date(s).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return s; } };
const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5);
const normReg = (s) => String(s || '').toUpperCase().replace(/\s+/g, ' ').trim();
const regOK = (s) => /^[A-Z0-9][A-Z0-9 -]{2,11}$/.test(s);
const unique = (arr) => Array.from(new Set(arr.filter(Boolean)));

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)) || []; } catch (e) { return []; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const sess = {
  get() { try { return JSON.parse(sessionStorage.getItem('gm_session')); } catch (e) { return null; } },
  set(v) { try { sessionStorage.setItem('gm_session', JSON.stringify(v)); } catch (e) {} }
};

// ---- Data -----------------------------------------------------------------
function hires() {
  return store.get('gm_income').map((r, i) => {
    const payments = r.payments || [{ ts: r.ts, date: r.date, amount: r.paid || 0, by: r.by }];
    const paid = sum(payments, (p) => p.amount);
    const total = r.rate * r.days;
    return { ...r, id: r.id || 'GM-' + String(i + 1).padStart(4, '0'), reg: r.reg || '', prepaid: !!r.prepaid, startDate: r.startDate || r.date, payments, paid, total, balance: total - paid };
  });
}
function saveHires(list) { store.set('gm_income', list.map(({ paid, balance, total, ...rest }) => rest)); }
function expenses() {
  return store.get('gm_expense').map((r, i) => ({ ...r, id: 'EX-' + String(i + 1).padStart(4, '0'), vehicle: r.vehicle || '', reg: r.reg || '' }));
}
function prepStatus(h) {
  const t = today();
  if (h.startDate > t) { const d = daysBetween(t, h.startDate); return { key: 'upcoming', label: 'Starts in ' + d + ' day' + (d === 1 ? '' : 's') }; }
  if (h.startDate === t) return { key: 'today', label: 'Starts today' };
  return { key: 'started', label: 'Hire started' };
}
function regsFor(vehicle) {
  const a = hires().filter((h) => h.vehicle === vehicle).map((h) => h.reg);
  const b = expenses().filter((x) => x.vehicle === vehicle).map((x) => x.reg);
  return unique(a.concat(b));
}
function ledger() {
  const rows = [];
  hires().forEach((h) => h.payments.forEach((p, j) => rows.push({
    ts: p.ts, date: p.date, dir: 'in', type: j === 0 ? (h.prepaid ? 'Prepayment' : 'New hire') : 'Balance payment',
    ref: h.id, details: h.customer, vehicle: h.vehicle, reg: h.reg, category: 'Hire income', amount: p.amount, by: p.by
  })));
  expenses().forEach((x) => rows.push({
    ts: x.ts, date: x.date, dir: 'out', type: 'Expense', ref: x.id, details: x.what + ' · ' + x.category,
    vehicle: x.vehicle, reg: x.reg, category: x.category, amount: x.amount, by: x.by
  }));
  return rows.sort((a, b) => b.date.localeCompare(a.date) || String(b.ts).localeCompare(String(a.ts)));
}

// ---- Periods ----------------------------------------------------------------
const PRESETS = [['month', 'This month'], ['lastmonth', 'Last month'], ['3months', 'Last 3 months'], ['year', 'This year'], ['12months', 'Last 12 months'], ['all', 'All time'], ['custom', 'Custom dates']];
function presetDates(p) {
  const n = new Date(), y = n.getFullYear(), m = n.getMonth();
  if (p === 'month') return [iso(new Date(y, m, 1)), iso(new Date(y, m + 1, 0))];
  if (p === 'lastmonth') return [iso(new Date(y, m - 1, 1)), iso(new Date(y, m, 0))];
  if (p === '3months') return [iso(new Date(y, m - 2, 1)), iso(new Date(y, m + 1, 0))];
  if (p === 'year') return [iso(new Date(y, 0, 1)), iso(new Date(y, 11, 31))];
  if (p === '12months') return [iso(new Date(y, m - 11, 1)), iso(new Date(y, m + 1, 0))];
  return ['', ''];
}
function newRange(p) { const d = presetDates(p); return { preset: p, from: d[0], to: d[1] }; }
const inRange = (d, r) => (!r.from || d >= r.from) && (!r.to || d <= r.to);
const rangeLabel = (r) => (!r.from && !r.to ? 'All time' : (r.from ? fmtD(r.from) : 'the start') + ' to ' + (r.to ? fmtD(r.to) : 'today'));
function rangeControl(p, r) {
  return `<div class="rangebar">
    <div class="field"><label for="${p}p">Period</label><select id="${p}p">${PRESETS.map((x) => `<option value="${x[0]}" ${r.preset === x[0] ? 'selected' : ''}>${x[1]}</option>`).join('')}</select></div>
    <div class="field"><label for="${p}f">From</label><input id="${p}f" type="date" value="${esc(r.from)}"></div>
    <div class="field"><label for="${p}t">To</label><input id="${p}t" type="date" value="${esc(r.to)}"></div>
  </div>`;
}
function wireRange(p, r, onChange) {
  const sel = $(p + 'p'), f = $(p + 'f'), t = $(p + 't');
  sel.addEventListener('change', () => {
    if (sel.value !== 'custom') { Object.assign(r, newRange(sel.value)); f.value = r.from; t.value = r.to; } else r.preset = 'custom';
    onChange();
  });
  const custom = () => { r.from = f.value; r.to = t.value; r.preset = 'custom'; sel.value = 'custom'; onChange(); };
  f.addEventListener('change', custom);
  t.addEventListener('change', custom);
}

// ---- Month helpers ----------------------------------------------------------
const monthKey = (d) => d.slice(0, 7);
const monthLabel = (k) => { const p = k.split('-'); return new Date(+p[0], +p[1] - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }); };
const quarterKey = (k) => { const p = k.split('-').map(Number); return p[0] + ' Q' + Math.ceil(p[1] / 3); };
function monthsBetween(a, b) {
  const out = []; let p = a.split('-').map(Number); const q = b.split('-').map(Number);
  while ((p[0] < q[0] || (p[0] === q[0] && p[1] <= q[1])) && out.length < 60) { out.push(p[0] + '-' + String(p[1]).padStart(2, '0')); p[1]++; if (p[1] > 12) { p[1] = 1; p[0]++; } }
  return out;
}
function monthSpan(L, r) {
  if (!L.length && !r.from) return [];
  const dates = L.map((x) => x.date).sort();
  const a = r.from ? monthKey(r.from) : monthKey(dates[0]);
  const b = r.to ? monthKey(r.to) : monthKey(today());
  return monthsBetween(a, b);
}

// ---- Totals for a period -----------------------------------------------------
function aggregate(r) {
  const all = hires();
  const L = ledger().filter((x) => inRange(x.date, r));
  const ins = L.filter((x) => x.dir === 'in'), outs = L.filter((x) => x.dir === 'out');
  const byCat = {}, byVeh = {}, inM = {}, outM = {};
  outs.forEach((x) => { const c = byCat[x.category] || (byCat[x.category] = { n: 0, total: 0 }); c.n++; c.total += x.amount; outM[monthKey(x.date)] = (outM[monthKey(x.date)] || 0) + x.amount; });
  ins.forEach((x) => { const v = byVeh[x.vehicle] || (byVeh[x.vehicle] = { n: 0, total: 0 }); v.n++; v.total += x.amount; inM[monthKey(x.date)] = (inM[monthKey(x.date)] || 0) + x.amount; });
  const hr = all.filter((h) => inRange(h.date, r));
  const awaiting = all.filter((h) => h.prepaid && h.startDate >= today());
  return {
    all, L, ins, outs, hr, awaiting, byCat, byVeh, inM, outM,
    tin: sum(ins, (x) => x.amount), tout: sum(outs, (x) => x.amount),
    owed: sum(all.filter((h) => h.balance > 0.005), (h) => h.balance),
    held: sum(awaiting, (h) => h.paid)
  };
}

// ---- Small HTML helpers -------------------------------------------------------
const isR = (c) => /\|r$/.test(c);
const hd = (c) => c.replace(/\|r$/, '');
function table(cols, rows, foot) {
  return `<div class="tablewrap"><table><thead><tr>${cols.map((c) => `<th class="${isR(c) ? 'r' : ''}">${hd(c)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td class="${isR(cols[i]) ? 'r' : ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody>${foot ? `<tfoot><tr>${foot.map((c, i) => `<td class="${isR(cols[i]) ? 'r' : ''}">${c}</td>`).join('')}</tr></tfoot>` : ''}</table></div>`;
}
const pill = (t, cls) => `<span class="pill ${cls || ''}">${esc(t)}</span>`;
const typePill = (t) => pill(t, t === 'Expense' ? 'out' : t === 'Prepayment' ? 'pre' : t === 'Balance payment' ? 'bal' : '');
const vehCell = (v, reg) => esc(v || '—') + (reg ? `<small>${esc(reg)}</small>` : '');
const field = (id, label, help, control, err) => `<div class="field ${err ? 'bad' : ''}"><label for="${id}">${label}</label>${control}${err ? `<div class="err" role="alert">${esc(err)}</div>` : ''}<div class="help">${help}</div></div>`;

function hbars(entries, cls) {
  if (!entries.length) return '<div class="empty">No entries in this period yet.</div>';
  const max = Math.max.apply(null, entries.map((e) => e[1])) || 1;
  return entries.map((e) => `<div class="bar ${cls || ''}"><div class="t"><span>${esc(e[0])}</span><b>${money(e[1])}</b></div><div class="b"><i style="width:${Math.max(3, (e[1] / max) * 100)}%"></i></div></div>`).join('');
}

function donut(items, label) {
  const total = sum(items, (i) => i.value);
  if (!total) return '<div class="empty">No entries in this period yet.</div>';
  const R = 70, C = 2 * Math.PI * R;
  let off = 0;
  const segs = items.map((it, i) => {
    const len = (it.value / total) * C;
    const s = `<circle cx="100" cy="100" r="${R}" fill="none" stroke="${PALETTE[i % PALETTE.length]}" stroke-width="36" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 100 100)"></circle>`;
    off += len; return s;
  }).join('');
  const legend = items.map((it, i) => `<li><span class="sw" style="background:${PALETTE[i % PALETTE.length]}"></span><span class="lt">${esc(it.label)}</span><span class="lv">${money(it.value)} <small>${pct(it.value, total)}</small></span></li>`).join('');
  return `<div class="donutwrap"><svg class="donut" viewBox="0 0 200 200" role="img" aria-label="${esc(label)}">${segs}<text x="100" y="96" text-anchor="middle" class="dl">Total</text><text x="100" y="116" text-anchor="middle" class="dv">${esc(money(total))}</text></svg><ul class="legend">${legend}</ul></div>`;
}

function vbars(keys, series, label) {
  if (!keys.length) return '<div class="empty">No entries in this period yet.</div>';
  const max = Math.max.apply(null, [1].concat(keys.map((k) => Math.max.apply(null, series.map((s) => s.map[k] || 0)))));
  const cols = keys.map((k) => `<div class="vb"><div class="vbpair">${series.map((s) => `<i style="height:${((s.map[k] || 0) / max) * 100}%;background:${s.color}" title="${esc(s.name + ' ' + monthLabel(k) + ': ' + money(s.map[k] || 0))}"></i>`).join('')}</div><div class="vbl">${esc(monthLabel(k))}</div></div>`).join('');
  return `<div class="vbwrap"><div class="vbars" style="min-width:${keys.length * 56}px" role="img" aria-label="${esc(label)}">${cols}</div></div><div class="keys">${series.map((s) => `<span><i class="sw" style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}<span class="muted">Hover or tap a bar to see the amount.</span></div>`;
}

function downloadCSV(name, head, rows) {
  const q = (v) => { if (typeof v === 'string' && /^[=+\-@]/.test(v)) v = "'" + v; return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
  const text = [head].concat(rows).map((r) => r.map(q).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
}
const ledgerCSVHead = ['Date', 'Time entered', 'Type', 'Reference', 'Details', 'Vehicle', 'Registration', 'Category', 'Money in (K)', 'Money out (K)', 'Entered by'];
const ledgerCSVRow = (x) => [x.date, fmtDT(x.ts), x.type, x.ref, x.details, x.vehicle, x.reg, x.category, x.dir === 'in' ? x.amount.toFixed(2) : '', x.dir === 'out' ? x.amount.toFixed(2) : '', x.by];
