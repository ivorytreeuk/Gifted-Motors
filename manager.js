/* manager.js = manager password gate, overview, and the drill-down pages. */

let rng = newRange('month');      // overview, spending, vehicles
let ordRng = newRange('all');     // orders page
const ordF = { q: '', type: '', by: '', vehicle: '' };
const spF = { cat: '', q: '' };
const vhF = { vehicle: '' };
const prF = { status: 'awaiting', q: '' };
const owF = { q: '' };

function mShell(title, lead, body, noPrintTitle) {
  return header() + `<main class="page"><div class="crumb noprint"><a href="#/m">← Back to manager overview</a></div><div class="${noPrintTitle ? 'noprint' : ''}"><h1>${title}</h1><p class="lead">${lead}</p></div>${body}</main>`;
}
const sel = (id, opts, cur) => `<select id="${id}">${opts.map((o) => `<option value="${esc(o[0])}" ${cur === o[0] ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
const noRows = '<div class="empty">Nothing matches. Try a wider period or clear the search.</div>';
const stat = (l, v, cls, extra) => `<div class="stat ${cls || ''}"><div class="l">${l}</div><div class="v">${v}</div>${extra ? `<div class="sub">${extra}</div>` : ''}</div>`;

function managerGate(msg) {
  app.innerHTML = header() + `<main class="page"><div class="card form" style="max-width:480px">
    <div><h1>Manager area</h1><p class="lead">This part needs the manager password.</p></div>
    ${msg ? `<div class="errbox" role="alert">${esc(msg)}</div>` : ''}
    <form class="form" id="mf" novalidate>
      <div class="field"><label for="mpw">Manager password</label><input id="mpw" type="password" placeholder="Type the manager password"><div class="help">Demo only: the manager password is <b>manager</b>.</div></div>
      <button class="btn" type="submit">Open manager area</button>
    </form></div></main>`;
  wireHeader();
  $('mf').addEventListener('submit', (ev) => {
    ev.preventDefault();
    if ($('mpw').value === DEMO_PASSWORDS.manager) { session.mgr = true; sess.set(session); render(); }
    else managerGate('That password is not right.');
  });
}

// ---- Overview -----------------------------------------------------------------
function overviewView() {
  const A = aggregate(rng);
  const cats = Object.keys(A.byCat).map((k) => [k, A.byCat[k].total]).sort((a, b) => b[1] - a[1]);
  const vehs = Object.keys(A.byVeh).map((k) => [k, A.byVeh[k].total]).sort((a, b) => b[1] - a[1]);
  const owing = A.all.filter((h) => h.balance > 0.005).sort((a, b) => b.balance - a.balance).slice(0, 5);
  const pre = A.awaiting.slice().sort((a, b) => a.startDate.localeCompare(b.startDate)).slice(0, 5);
  const latest = A.L.slice().sort((a, b) => String(b.ts).localeCompare(String(a.ts))).slice(0, 8);
  const link = (href, cls, inner) => `<a class="${cls}" href="${href}">${inner}</a>`;
  app.innerHTML = header() + `<main class="page">
    <div class="toolbar"><div><h1>Manager overview</h1><p class="lead">Tap any box or panel to open the full details.</p></div>
      <a class="btn" href="#/m/report" style="display:inline-flex;align-items:center;text-decoration:none">Download financial report</a></div>
    <div class="card">${rangeControl('o', rng)}<div class="help" style="margin-top:12px">The period applies to money in, money out and the breakdowns. "Still owed" and "Prepaid" always show the position right now.</div></div>
    <div class="stats">
      ${link('#/m/orders', 'stat', `<div class="l">Money in</div><div class="v">${money(A.tin)}</div><div class="go">View all orders →</div>`)}
      ${link('#/m/spending', 'stat', `<div class="l">Money out</div><div class="v">${money(A.tout)}</div><div class="go">See where it goes →</div>`)}
      ${link('#/m/report', 'stat dark', `<div class="l">Profit</div><div class="v">${money(A.tin - A.tout)}</div><div class="go">Open financial report →</div>`)}
      ${link('#/m/owing', 'stat warn', `<div class="l">Still owed to us</div><div class="v">${money(A.owed)}</div><div class="go">See who owes →</div>`)}
      ${link('#/m/prepaid', 'stat', `<div class="l">Prepaid, hire not started</div><div class="v">${money(A.held)}</div><div class="go">${A.awaiting.length} booking${A.awaiting.length === 1 ? '' : 's'} · track prepaid →</div>`)}
    </div>
    <div class="cols">
      ${link('#/m/spending', 'card panel', `<div class="phead"><h2>Where the money goes</h2><span class="more">Full breakdown →</span></div>${hbars(cats, 'y')}`)}
      ${link('#/m/vehicles', 'card panel', `<div class="phead"><h2>Which vehicles earn most</h2><span class="more">Full breakdown →</span></div>${hbars(vehs, '')}`)}
    </div>
    <div class="cols">
      ${link('#/m/prepaid', 'card panel', `<div class="phead"><h2>Prepaid bookings coming up</h2><span class="more">Track all →</span></div>${pre.length ? pre.map((h) => `<div class="mini"><div>${esc(h.customer)}<small>${esc(h.id)} · ${esc(h.vehicle)} ${esc(h.reg)} · starts ${esc(fmtD(h.startDate))}</small></div><b>${money(h.paid)}</b></div>`).join('') : '<div class="empty">No prepaid bookings waiting to start.</div>'}`)}
      ${link('#/m/owing', 'card panel', `<div class="phead"><h2>Who owes us money</h2><span class="more">See all →</span></div>${owing.length ? owing.map((h) => `<div class="mini"><div>${esc(h.customer)}<small>${esc(h.id)} · ${esc(h.vehicle)} ${esc(h.reg)}</small></div><b>${money(h.balance)}</b></div>`).join('') : '<div class="empty">Nobody owes anything right now.</div>'}`)}
    </div>
    <section class="card"><div class="phead"><h2>Latest entries and who recorded them</h2><a class="more" href="#/m/orders">View all orders →</a></div>
      <div class="help" style="margin-bottom:10px">Every entry carries the staff member's name and a time stamp.</div>
      ${latest.length ? table(['Entered', 'Type', 'Details', 'Vehicle', 'Amount|r', 'Entered by'], latest.map((x) => [esc(fmtDT(x.ts)), typePill(x.type), esc(x.details), vehCell(x.vehicle, x.reg), `<b>${money(x.amount)}</b>`, `<b>${esc(x.by)}</b>`])) : '<div class="empty">Nothing recorded in this period yet. Add an entry on the Money in or Money out page and it will show here.</div>'}
    </section>
    <div><button class="btn small ghost" id="clear" type="button">Clear demo entries</button></div>
  </main>`;
  wireHeader();
  wireRange('o', rng, overviewView);
  $('clear').addEventListener('click', () => { if (confirm('Remove all demo entries from this device?')) { store.set('gm_income', []); store.set('gm_expense', []); overviewView(); } });
}

// ---- All orders -----------------------------------------------------------------
function ordersView() {
  const L0 = ledger();
  const staff = unique(L0.map((x) => x.by)).sort();
  app.innerHTML = mShell('All orders and entries', 'Every hire, payment and expense in one table. Use the filters to narrow it down.', `
    <div class="card form">
      ${rangeControl('or', ordRng)}
      <div class="row3">
        ${field('oq', 'Search', 'A name, vehicle, number plate, booking number or any word.', `<input id="oq" type="search" placeholder="Search..." value="${esc(ordF.q)}">`)}
        ${field('otype', 'Type', '', sel('otype', [['', 'Everything'], ['New hire', 'New hire'], ['Prepayment', 'Prepayment'], ['Balance payment', 'Balance payment'], ['Expense', 'Expense']], ordF.type))}
        ${field('oby', 'Entered by', '', sel('oby', [['', 'Everyone']].concat(staff.map((s) => [s, s])), ordF.by))}
      </div>
      ${field('ove', 'Vehicle', '', sel('ove', [['', 'All vehicles']].concat(VEHICLES.map((v) => [v, v])), ordF.vehicle))}
      <div><button class="btn small ghost" id="oclear" type="button">Clear filters</button></div>
    </div>
    <div class="card" id="res"></div>`);
  wireHeader();
  const update = () => {
    const q = ordF.q.trim().toLowerCase();
    const rows = ledger().filter((x) => inRange(x.date, ordRng) && (!ordF.type || x.type === ordF.type) && (!ordF.by || x.by === ordF.by) && (!ordF.vehicle || x.vehicle === ordF.vehicle)
      && (!q || [x.ref, x.details, x.vehicle, x.reg, x.category, x.by, x.type].join(' ').toLowerCase().indexOf(q) >= 0));
    const tin = sum(rows.filter((x) => x.dir === 'in'), (x) => x.amount), tout = sum(rows.filter((x) => x.dir === 'out'), (x) => x.amount);
    $('res').innerHTML = `<div class="reshead"><div><b>${rows.length}</b> entr${rows.length === 1 ? 'y' : 'ies'} · ${esc(rangeLabel(ordRng))}</div><button class="btn small ghost" id="ocsv" type="button">Download these rows (CSV)</button></div>`
      + (rows.length ? table(['Date', 'Type', 'Ref', 'Details', 'Vehicle', 'Money in|r', 'Money out|r', 'Entered by'],
        rows.slice(0, 500).map((x) => [esc(fmtD(x.date)) + `<small>entered ${esc(fmtDT(x.ts))}</small>`, typePill(x.type), esc(x.ref), esc(x.details), vehCell(x.vehicle, x.reg), x.dir === 'in' ? money(x.amount) : '', x.dir === 'out' ? money(x.amount) : '', esc(x.by)]),
        ['', '', '', '<b>Totals</b>', '', `<b>${money(tin)}</b>`, `<b>${money(tout)}</b>`, '']) + (rows.length > 500 ? '<div class="help">Showing the latest 500. Narrow the filters, or download the CSV for everything.</div>' : '') : noRows);
    const b = $('ocsv');
    if (b) b.addEventListener('click', () => downloadCSV('gifted-motors-orders.csv', ledgerCSVHead, rows.map(ledgerCSVRow)));
  };
  wireRange('or', ordRng, update);
  $('oq').addEventListener('input', () => { ordF.q = $('oq').value; update(); });
  [['otype', 'type'], ['oby', 'by'], ['ove', 'vehicle']].forEach((p) => $(p[0]).addEventListener('change', () => { ordF[p[1]] = $(p[0]).value; update(); }));
  $('oclear').addEventListener('click', () => { Object.assign(ordF, { q: '', type: '', by: '', vehicle: '' }); Object.assign(ordRng, newRange('all')); ordersView(); });
  update();
}

// ---- Spending deep dive ------------------------------------------------------------
function spendingView() {
  app.innerHTML = mShell('Where the money goes', 'A deeper look at spending: charts, a table by category, and every expense behind it.', `<div class="card">${rangeControl('sp', rng)}</div><div id="spbody"></div>`);
  wireHeader();
  const draw = () => {
    const A = aggregate(rng);
    const cats = Object.keys(A.byCat).map((k) => ({ k, n: A.byCat[k].n, total: A.byCat[k].total })).sort((a, b) => b.total - a.total);
    const top = cats[0];
    const months = monthSpan(A.outs, rng);
    $('spbody').innerHTML = `
      <div class="stats">${stat('Total spent', money(A.tout), 'warn')}${stat('Number of expenses', A.outs.length)}${stat('Biggest category', top ? esc(top.k) : '—', '', top ? money(top.total) + ' · ' + pct(top.total, A.tout) : '')}${stat('Average per expense', money(A.outs.length ? A.tout / A.outs.length : 0))}</div>
      <div class="cols">
        <section class="card"><h2>Share of spending</h2>${donut(cats.map((c) => ({ label: c.k, value: c.total })), 'Pie chart of spending by category')}</section>
        <section class="card"><h2>Spending by category</h2>${hbars(cats.map((c) => [c.k, c.total]), 'y')}</section>
      </div>
      <section class="card"><h2>Spending month by month</h2>${vbars(months, [{ name: 'Money out', color: '#E0A00B', map: A.outM }], 'Bar chart of spending by month')}</section>
      <section class="card"><h2>Category table</h2>${cats.length ? table(['Category', 'Entries|r', 'Total|r', 'Share|r', 'Average|r', ''], cats.map((c) => [esc(c.k), c.n, money(c.total), pct(c.total, A.tout), money(c.total / c.n), `<button class="btn small ghost" data-cat="${esc(c.k)}" type="button">View entries</button>`]), ['<b>Total</b>', `<b>${A.outs.length}</b>`, `<b>${money(A.tout)}</b>`, '100%', '', '']) : noRows}</section>
      <section class="card form" id="splistcard"><h2>Every expense</h2>
        <div class="row2">${field('spc', 'Category', '', sel('spc', [['', 'All categories']].concat(CATEGORIES.map((c) => [c, c])), spF.cat))}${field('spq', 'Search', 'What it was for, number plate or who entered it.', `<input id="spq" type="search" placeholder="Search..." value="${esc(spF.q)}">`)}</div>
        <div id="splist"></div></section>`;
    const list = () => {
      const q = spF.q.trim().toLowerCase();
      const rows = A.outs.filter((x) => (!spF.cat || x.category === spF.cat) && (!q || [x.details, x.vehicle, x.reg, x.by, x.ref].join(' ').toLowerCase().indexOf(q) >= 0));
      $('splist').innerHTML = `<div class="reshead"><div><b>${rows.length}</b> expense${rows.length === 1 ? '' : 's'} · ${money(sum(rows, (x) => x.amount))}</div><button class="btn small ghost" id="spcsv" type="button">Download (CSV)</button></div>`
        + (rows.length ? table(['Date', 'What it was for', 'Category', 'Vehicle', 'Amount|r', 'Entered by'], rows.map((x) => [esc(fmtD(x.date)), esc(x.details.split(' · ')[0]), esc(x.category), vehCell(x.vehicle, x.reg), money(x.amount), esc(x.by)]), ['', '<b>Total</b>', '', '', `<b>${money(sum(rows, (x) => x.amount))}</b>`, '']) : noRows);
      const b = $('spcsv'); if (b) b.addEventListener('click', () => downloadCSV('gifted-motors-expenses.csv', ledgerCSVHead, rows.map(ledgerCSVRow)));
    };
    $('spc').addEventListener('change', () => { spF.cat = $('spc').value; list(); });
    $('spq').addEventListener('input', () => { spF.q = $('spq').value; list(); });
    qa('[data-cat]').forEach((b) => b.addEventListener('click', () => { spF.cat = b.dataset.cat; $('spc').value = spF.cat; list(); $('splistcard').scrollIntoView({ behavior: 'smooth' }); }));
    list();
  };
  wireRange('sp', rng, draw);
  draw();
}

// ---- Vehicles deep dive ---------------------------------------------------------------
function vehiclesView() {
  app.innerHTML = mShell('Which vehicles earn most', 'Money received, hires and costs for each vehicle type and each number plate.', `<div class="card">${rangeControl('vh', rng)}</div><div id="vhbody"></div>`);
  wireHeader();
  const draw = () => {
    const A = aggregate(rng);
    const names = unique(VEHICLES.concat(Object.keys(A.byVeh)).concat(A.outs.map((x) => x.vehicle)));
    const rowFor = (name) => {
      const hh = A.hr.filter((h) => h.vehicle === name);
      const recv = (A.byVeh[name] || {}).total || 0;
      const cost = sum(A.outs.filter((x) => x.vehicle === name), (x) => x.amount);
      return { name, n: hh.length, days: sum(hh, (h) => h.days), recv, owed: sum(hh.filter((h) => h.balance > 0.005), (h) => h.balance), cost, net: recv - cost };
    };
    const rows = names.map(rowFor).sort((a, b) => b.recv - a.recv);
    const unlinked = sum(A.outs.filter((x) => !x.vehicle), (x) => x.amount);
    const plates = {};
    const slot = (reg, veh) => { const k = (reg || '(not recorded)') + '|' + veh; return plates[k] || (plates[k] = { reg: reg || '(not recorded)', veh, n: 0, days: 0, recv: 0, cost: 0 }); };
    A.ins.forEach((x) => { slot(x.reg, x.vehicle).recv += x.amount; });
    A.outs.forEach((x) => { if (x.vehicle) slot(x.reg, x.vehicle).cost += x.amount; });
    A.hr.forEach((h) => { const s = slot(h.reg, h.vehicle); s.n++; s.days += h.days; });
    const prow = Object.keys(plates).map((k) => plates[k]).sort((a, b) => b.recv - a.recv);
    const best = rows[0];
    $('vhbody').innerHTML = `
      <div class="stats">${stat('Money received', money(A.tin), 'dark')}${stat('Hires in this period', A.hr.length)}${stat('Days hired', sum(A.hr, (h) => h.days))}${stat('Top earner', best && best.recv > 0 ? esc(best.name) : '—', '', best && best.recv > 0 ? money(best.recv) + ' · ' + pct(best.recv, A.tin) : '')}</div>
      <div class="cols">
        <section class="card"><h2>Share of money received</h2>${donut(rows.filter((r) => r.recv > 0).map((r) => ({ label: r.name, value: r.recv })), 'Pie chart of money received by vehicle')}</section>
        <section class="card"><h2>Money received by vehicle</h2>${hbars(rows.filter((r) => r.recv > 0).map((r) => [r.name, r.recv]), '')}</section>
      </div>
      <section class="card"><h2>By type of vehicle</h2>${table(['Vehicle', 'Hires|r', 'Days|r', 'Money received|r', 'Still owed|r', 'Costs recorded|r', 'Net|r'], rows.map((r) => [esc(r.name), r.n, r.days, money(r.recv), money(r.owed), money(r.cost), `<b>${money(r.net)}</b>`]),
        ['<b>Total</b>', `<b>${sum(rows, (r) => r.n)}</b>`, `<b>${sum(rows, (r) => r.days)}</b>`, `<b>${money(sum(rows, (r) => r.recv))}</b>`, `<b>${money(sum(rows, (r) => r.owed))}</b>`, `<b>${money(sum(rows, (r) => r.cost))}</b>`, `<b>${money(sum(rows, (r) => r.net))}</b>`])}
        <div class="help" style="margin-top:10px">Costs recorded means expenses staff linked to a vehicle. Costs not linked to any vehicle (${money(unlinked)}) are left out of this table.</div></section>
      <section class="card"><h2>By number plate</h2>${prow.length ? table(['Registration', 'Vehicle', 'Hires|r', 'Days|r', 'Money received|r', 'Costs recorded|r', 'Net|r'], prow.map((r) => [`<b>${esc(r.reg)}</b>`, esc(r.veh), r.n, r.days, money(r.recv), money(r.cost), `<b>${money(r.recv - r.cost)}</b>`])) : noRows}</section>
      <section class="card form"><h2>Hires in this period</h2>
        ${field('vhv', 'Show hires for', '', sel('vhv', [['', 'All vehicles']].concat(VEHICLES.map((v) => [v, v])), vhF.vehicle))}
        <div id="vhlist"></div></section>`;
    const list = () => {
      const hh = A.hr.filter((h) => !vhF.vehicle || h.vehicle === vhF.vehicle).sort((a, b) => b.date.localeCompare(a.date));
      $('vhlist').innerHTML = hh.length ? table(['Booking', 'Date', 'Customer', 'Vehicle', 'Days|r', 'Total|r', 'Paid|r', 'Owed|r'], hh.map((h) => [esc(h.id) + (h.prepaid ? ' ' + pill('Prepaid', 'pre') : ''), esc(fmtD(h.date)), esc(h.customer), vehCell(h.vehicle, h.reg), h.days, money(h.total), money(h.paid), money(Math.max(0, h.balance))]),
        ['', '', '', '<b>Total</b>', `<b>${sum(hh, (h) => h.days)}</b>`, `<b>${money(sum(hh, (h) => h.total))}</b>`, `<b>${money(sum(hh, (h) => h.paid))}</b>`, `<b>${money(sum(hh, (h) => Math.max(0, h.balance)))}</b>`]) : noRows;
    };
    $('vhv').addEventListener('change', () => { vhF.vehicle = $('vhv').value; list(); });
    list();
  };
  wireRange('vh', rng, draw);
  draw();
}

// ---- Prepaid tracker --------------------------------------------------------------------
function prepaidView() {
  const all = hires().filter((h) => h.prepaid);
  const awaiting = all.filter((h) => h.startDate >= today());
  const started = all.filter((h) => h.startDate < today());
  const months = {}; awaiting.forEach((h) => { months[monthKey(h.startDate)] = (months[monthKey(h.startDate)] || 0) + h.paid; });
  const mk = Object.keys(months).sort();
  app.innerHTML = mShell('Prepaid bookings', 'Customers who paid in advance. Track who is due to collect, how much is held, and what is still to pay.', `
    <div class="stats">${stat('Bookings waiting to start', awaiting.length)}${stat('Prepayments held', money(sum(awaiting, (h) => h.paid)), 'dark')}${stat('Still due on these', money(sum(awaiting, (h) => Math.max(0, h.balance))), 'warn')}${stat('Already started', started.length)}</div>
    ${mk.length ? `<section class="card"><h2>Prepayments held, by month the hire starts</h2>${vbars(mk, [{ name: 'Prepaid', color: '#0E2A5B', map: months }], 'Bar chart of prepayments by start month')}</section>` : ''}
    <section class="card form"><h2>All prepaid bookings</h2>
      <div class="row2">${field('prs', 'Show', '', sel('prs', [['awaiting', 'Waiting to start'], ['started', 'Already started'], ['all', 'All prepaid bookings']], prF.status))}${field('prq', 'Search', 'Customer, vehicle, number plate or booking number.', `<input id="prq" type="search" placeholder="Search..." value="${esc(prF.q)}">`)}</div>
      <div id="prlist"></div></section>`);
  wireHeader();
  const list = () => {
    const q = prF.q.trim().toLowerCase();
    const rows = all.filter((h) => (prF.status === 'all' || (prF.status === 'awaiting') === (h.startDate >= today())) && (!q || [h.id, h.customer, h.vehicle, h.reg, h.by].join(' ').toLowerCase().indexOf(q) >= 0)).sort((a, b) => a.startDate.localeCompare(b.startDate));
    $('prlist').innerHTML = rows.length ? table(['Booking', 'Customer', 'Vehicle', 'Prepaid so far|r', 'Hire total|r', 'Balance|r', 'Hire starts', 'Status', 'Entered by'],
      rows.map((h) => { const s = prepStatus(h); return [esc(h.id), esc(h.customer), vehCell(h.vehicle, h.reg), money(h.paid), money(h.total), money(Math.max(0, h.balance)), esc(fmtD(h.startDate)), pill(s.label, s.key === 'started' ? '' : s.key === 'today' ? 'out' : 'pre'), esc(h.by)]; }),
      ['', '<b>Total</b>', '', `<b>${money(sum(rows, (h) => h.paid))}</b>`, `<b>${money(sum(rows, (h) => h.total))}</b>`, `<b>${money(sum(rows, (h) => Math.max(0, h.balance)))}</b>`, '', '', '']) : '<div class="empty">No prepaid bookings match. Prepayments are recorded on the Money in page by choosing "Yes, paid in advance".</div>';
  };
  $('prs').addEventListener('change', () => { prF.status = $('prs').value; list(); });
  $('prq').addEventListener('input', () => { prF.q = $('prq').value; list(); });
  list();
}

// ---- Who owes us ---------------------------------------------------------------------------
function owingView() {
  const open = hires().filter((h) => h.balance > 0.005).map((h) => ({ ...h, age: Math.max(0, daysBetween(h.startDate, today())) })).sort((a, b) => b.balance - a.balance);
  const bucket = (lo, hi) => open.filter((h) => h.age >= lo && h.age <= hi);
  const bands = [['0 to 7 days', bucket(0, 7)], ['8 to 30 days', bucket(8, 30)], ['Over 30 days', bucket(31, 99999)]];
  app.innerHTML = mShell('Who owes us money', 'Customers with a balance still to pay. The age counts the days since the hire started.', `
    <div class="stats">${stat('Total owed', money(sum(open, (h) => h.balance)), 'warn')}${stat('Bookings with a balance', open.length)}${stat('Oldest balance', open.length ? Math.max.apply(null, open.map((h) => h.age)) + ' days' : '—')}</div>
    <section class="card"><h2>How old are the balances?</h2>${table(['Age', 'Bookings|r', 'Owed|r'], bands.map((b) => [b[0], b[1].length, money(sum(b[1], (h) => h.balance))]))}</section>
    <section class="card form"><h2>All unpaid balances</h2>
      ${field('owq', 'Search', 'Customer, vehicle, number plate or booking number.', `<input id="owq" type="search" placeholder="Search..." value="${esc(owF.q)}">`)}
      <div id="owlist"></div></section>`);
  wireHeader();
  const list = () => {
    const q = owF.q.trim().toLowerCase();
    const rows = open.filter((h) => !q || [h.id, h.customer, h.vehicle, h.reg].join(' ').toLowerCase().indexOf(q) >= 0);
    $('owlist').innerHTML = rows.length ? table(['Booking', 'Customer', 'Vehicle', 'Hire date', 'Age (days)|r', 'Total|r', 'Paid|r', 'Owed|r'], rows.map((h) => [esc(h.id) + (h.prepaid ? ' ' + pill('Prepaid', 'pre') : ''), esc(h.customer), vehCell(h.vehicle, h.reg), esc(fmtD(h.startDate)), h.age, money(h.total), money(h.paid), `<b>${money(h.balance)}</b>`]),
      ['', '<b>Total</b>', '', '', '', `<b>${money(sum(rows, (h) => h.total))}</b>`, `<b>${money(sum(rows, (h) => h.paid))}</b>`, `<b>${money(sum(rows, (h) => h.balance))}</b>`]) : '<div class="empty">Nobody owes anything that matches.</div>';
  };
  $('owq').addEventListener('input', () => { owF.q = $('owq').value; list(); });
  list();
}
