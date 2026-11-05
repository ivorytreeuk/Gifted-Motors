/* staff.js = sign in, page header, and the two staff forms (money in / money out). */

let session = sess.get();
const route = () => (location.hash || '').replace(/^#\/?/, '') || 'income';
function setHash(h) { try { history.replaceState(null, '', h); } catch (e) { location.hash = h; } }

function header() {
  const r = route();
  return `<div class="demo noprint">Demo version: entries stay on this device and are not sent to Google Sheets yet.</div>
  <header class="top noprint"><div class="top-in">
    <img src="logo.png" alt="Gifted Motors">
    <nav class="tabs" aria-label="Pages">
      <a class="tab ${r === 'income' ? 'on' : ''}" href="#/income">Money in</a>
      <a class="tab ${r === 'expense' ? 'on' : ''}" href="#/expense">Money out</a>
      <a class="tab ${r.charAt(0) === 'm' ? 'on' : ''}" href="#/m">Manager</a>
    </nav>
    <div class="who">Signed in as <b>${esc(session.name)}</b> <button class="linkbtn" id="signout" type="button">Sign out</button></div>
  </div></header>`;
}
function wireHeader() {
  const so = $('signout');
  if (so) so.addEventListener('click', () => { session = null; sess.set(null); setHash('#/income'); render(); });
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
  $('signinform').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('nm').value.trim();
    if (name.length < 2) return signIn('Please type your name so we know who is recording.');
    if ($('pw').value !== DEMO_PASSWORDS.staff) return signIn('That password is not right. Please try again or ask the manager.');
    session = { name };
    sess.set(session);
    setHash('#/income');
    render();
  });
}

function recent(kind) {
  const rows = (kind === 'hire' ? hires() : expenses()).slice(-3).reverse();
  if (!rows.length) return '<div class="empty">Nothing recorded yet on this device.</div>';
  return rows.map((r) => kind === 'hire'
    ? `<div class="mini"><div>${esc(r.customer)}<small>${esc(r.id)} · ${esc(r.vehicle)} ${esc(r.reg)}</small></div><b>${money(r.paid)}</b></div>`
    : `<div class="mini"><div>${esc(r.what)}<small>${esc(r.category)}${r.reg ? ' · ' + esc(r.reg) : ''} · ${esc(fmtD(r.date))}</small></div><b>${money(r.amount)}</b></div>`).join('');
}

function vehicleSelect(state, noneLabel) {
  return `<select id="vehicle"><option value="">${noneLabel}</option>${VEHICLES.map((v) => `<option ${state.vehicle === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>`;
}
function regField(state, e, optionalNote) {
  const list = regsFor(state.vehicle || '').map((r) => `<option value="${esc(r)}">`).join('');
  return `<div id="regbox" ${state.vehicle ? '' : 'hidden'}>${field('reg', 'Registration number (number plate)', 'Type the number plate exactly as it is on the vehicle.' + (optionalNote || ''),
    `<input id="reg" type="text" list="regs" autocapitalize="characters" autocomplete="off" placeholder="e.g. ABC 1234" value="${esc(state.reg || '')}"><datalist id="regs">${list}</datalist>`, e.reg)}</div>`;
}
function wireVehicle() {
  $('vehicle').addEventListener('change', () => {
    const v = $('vehicle').value;
    $('regbox').hidden = !v;
    $('regs').innerHTML = regsFor(v).map((r) => `<option value="${esc(r)}">`).join('');
  });
}

function newHireFields(s, e) {
  return `<div class="row2">
      ${field('date', 'Date paid', 'The day the customer paid you.', `<input id="date" type="date" value="${esc(s.date || today())}">`, e.date)}
      ${field('customer', 'Customer name', 'Who is hiring. Spell it the same way every time.', `<input id="customer" type="text" placeholder="First and last name" value="${esc(s.customer || '')}">`, e.customer)}
    </div>
    ${field('phone', 'Customer phone number', 'A number we can reach the customer on. Include the area code, for example +260 97 123 4567.', `<input id="phone" type="tel" inputmode="tel" autocomplete="off" placeholder="e.g. +260 97 123 4567" value="${esc(s.phone || '')}">`, e.phone)}
    ${field('vehicle', 'Type of vehicle', 'Which type of vehicle they are hiring. The number plate box appears after you choose.', vehicleSelect(s, 'Choose a vehicle'), e.vehicle)}
    ${regField(s, e)}
    <div class="row3">
      ${field('rate', 'Daily rate (K)', 'What it costs to hire this vehicle for one day, in Kwacha.', `<input id="rate" type="number" inputmode="decimal" min="0" value="${esc(s.rate || '')}">`, e.rate)}
      ${field('days', 'Days hired', 'How many days in total.', `<input id="days" type="number" inputmode="numeric" min="1" value="${esc(s.days || '')}">`, e.days)}
      ${field('paid', 'Amount paid now (K)', 'The money you are receiving today, even if only part of the total. Type 0 if nothing yet.', `<input id="paid" type="number" inputmode="decimal" min="0" value="${esc(s.paid || '')}">`, e.paid)}
    </div>
    <div class="prepbox">
      <div class="field"><span class="lbl" id="preplabel">Is this a prepayment?</span>
        <div class="seg" role="group" aria-labelledby="preplabel">
          <button type="button" class="segbtn ${s.prepaid ? '' : 'on'}" data-prep="no" aria-pressed="${!s.prepaid}">No, the hire starts now</button>
          <button type="button" class="segbtn ${s.prepaid ? 'on' : ''}" data-prep="yes" aria-pressed="${!!s.prepaid}">Yes, paid in advance</button>
        </div>
        <div class="help">Choose Yes if the customer is paying before they collect the vehicle. The manager can then track these bookings.</div>
      </div>
      <div id="prepextra" ${s.prepaid ? '' : 'hidden'}>
        ${field('startDate', 'Hire starts on', 'The day the customer will collect the vehicle.', `<input id="startDate" type="date" value="${esc(s.startDate || '')}">`, e.startDate)}
      </div>
    </div>
    <div class="balance"><div class="l">Balance still owed</div><div class="v" id="bal">K 0.00</div><div class="n">Worked out for you: rate × days, minus amount paid. You do not type this.</div></div>`;
}

function payFields(s, e, open) {
  if (!open.length) return '<div class="help"><b>There are no unpaid balances right now.</b> When a customer hires with a balance left, it will appear here.</div>';
  const opts = ['<option value="">Choose the booking</option>'].concat(open.map((h) => `<option value="${esc(h.id)}" ${s.bookingId === h.id ? 'selected' : ''}>${esc(h.id)} · ${esc(h.customer)} · ${esc(h.vehicle)}${h.reg ? ' ' + esc(h.reg) : ''} · owes ${money(h.balance)}</option>`)).join('');
  const h = open.find((x) => x.id === s.bookingId);
  const summary = h ? `<div class="summary">
      <div class="r2"><span>Customer</span><b>${esc(h.customer)}</b></div>
      <div class="r2"><span>Customer phone</span><b>${esc(h.phone || 'Not recorded')}</b></div>
      <div class="r2"><span>Vehicle</span><b>${esc(h.vehicle)}${h.reg ? ' · ' + esc(h.reg) : ''}</b></div>
      <div class="r2"><span>${h.prepaid ? 'Prepaid hire starts' : 'Hire started'}</span><b>${esc(fmtD(h.startDate))}</b></div>
      <div class="r2"><span>Total for the hire (${h.days} day${h.days === 1 ? '' : 's'} × ${money(h.rate)})</span><b>${money(h.total)}</b></div>
      <div class="r2"><span>Paid so far</span><b>${money(h.paid)}</b></div>
      <div class="r2"><span>Still owed</span><b>${money(h.balance)}</b></div>
    </div>` : '';
  return `${field('date', 'Date paid', 'The day the customer paid.', `<input id="date" type="date" value="${esc(s.date || today())}">`, e.date)}
    ${field('booking', 'Which hire is being paid off?', 'Pick the customer from the list. Only hires with money still owed are shown. Each one has a booking number.', `<select id="booking">${opts}</select>`, e.booking)}
    ${summary}
    ${field('amount', 'Amount paying now (K)', 'How much the customer is paying today, in Kwacha. Part-payments are fine.', `<input id="amount" type="number" inputmode="decimal" min="0" value="${esc(s.amount || '')}">`, e.amount)}
    ${h ? `<div class="balance"><div class="l">Balance after this payment</div><div class="v" id="bal2">${money(h.balance)}</div><div class="n">Worked out for you. The original hire record is updated, not duplicated.</div></div>` : ''}`;
}

function incomeView(state) {
  state = state || {};
  const mode = state.mode || 'new';
  const e = state.errors || {};
  const open = hires().filter((h) => h.balance > 0.005);
  app.innerHTML = header() + `<main class="page">
    <div><h1>Record money coming in</h1><p class="lead">First choose what is happening, then fill in the boxes.</p></div>
    <div class="grid">
      <div class="card form">
        <div class="seg" role="group" aria-label="What are you recording?">
          <button type="button" class="segbtn ${mode === 'new' ? 'on' : ''}" data-mode="new" aria-pressed="${mode === 'new'}">New hire</button>
          <button type="button" class="segbtn ${mode === 'pay' ? 'on' : ''}" data-mode="pay" aria-pressed="${mode === 'pay'}">Paying a balance</button>
        </div>
        <div class="help" style="margin-top:-8px">${mode === 'new' ? 'A new customer is hiring a vehicle. This adds a new line to the income sheet.' : 'A customer is paying off money they still owe on an earlier hire. This updates their existing line, so it is not counted twice.'}</div>
        <form class="form" id="f" novalidate>
          ${mode === 'new' ? newHireFields(state, e) : payFields(state, e, open)}
          <div class="stamp">This entry will be saved under your name, <b>${esc(session.name)}</b>, with today's date and time.</div>
          ${state.savedMsg ? `<div class="ok" role="status">${esc(state.savedMsg)}</div>` : ''}
          ${mode === 'pay' && !open.length ? '' : '<button class="btn" type="submit">Save</button>'}
        </form>
      </div>
      <aside class="side">
        <div class="card"><h2>Quick guide</h2><p><b>New hire:</b> a customer is starting a hire, or paying in advance for one.</p><p><b>Paying a balance:</b> a customer who already hired is paying more towards what they owe.</p><p>Made a mistake after saving? Tell the manager. Please do not enter it twice.</p></div>
        <div class="card" style="margin-top:20px"><h2>Latest hires</h2>${recent('hire')}</div>
      </aside>
    </div></main>`;
  wireHeader();
  qa('[data-mode]').forEach((b) => b.addEventListener('click', () => incomeView({ mode: b.dataset.mode })));
  const val = (id) => { const el = $(id); return el ? el.value : ''; };

  if (mode === 'new') {
    wireVehicle();
    let prepaid = !!state.prepaid;
    qa('[data-prep]').forEach((b) => b.addEventListener('click', () => {
      prepaid = b.dataset.prep === 'yes';
      qa('[data-prep]').forEach((x) => { const on = (x.dataset.prep === 'yes') === prepaid; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
      $('prepextra').hidden = !prepaid;
    }));
    const calc = () => { $('bal').textContent = money((parseFloat(val('rate')) || 0) * (parseFloat(val('days')) || 0) - (parseFloat(val('paid')) || 0)); };
    ['rate', 'days', 'paid'].forEach((id) => $(id).addEventListener('input', calc));
    calc();
    $('f').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const s = { mode, date: val('date'), customer: val('customer').trim(), phone: val('phone').trim(), vehicle: val('vehicle'), reg: normReg(val('reg')), rate: val('rate'), days: val('days'), paid: val('paid'), prepaid, startDate: prepaid ? val('startDate') : '' };
      const errors = {};
      if (!s.date) errors.date = 'Please pick the date.';
      if (s.customer.length < 2) errors.customer = 'Please type the customer name.';
      if (!s.vehicle) errors.vehicle = 'Please choose a type of vehicle.';
      if (!phoneOK(s.phone)) errors.phone = 'Please type the customer phone number, using numbers only (a + at the start is fine).';
      if (s.vehicle && !regOK(s.reg)) errors.reg = 'Please type the registration number (number plate), for example ABC 1234.';
      if (!(parseFloat(s.rate) > 0)) errors.rate = 'Please type the daily rate, for example 500.';
      if (!(parseFloat(s.days) >= 1)) errors.days = 'Please type how many days.';
      if (s.paid === '' || !(parseFloat(s.paid) >= 0)) errors.paid = 'Please type the amount paid. Type 0 if nothing was paid.';
      if (prepaid) {
        if (!s.startDate) errors.startDate = 'Please pick the day the hire starts.';
        else if (s.date && s.startDate < s.date) errors.startDate = 'The hire cannot start before the day it was paid for.';
        if (!(parseFloat(s.paid) > 0)) errors.paid = 'A prepayment needs an amount paid. Type how much the customer paid in advance.';
      }
      if (Object.keys(errors).length) return incomeView({ ...s, errors });
      const list = hires();
      const next = list.reduce((m, h) => Math.max(m, parseInt(String(h.id).replace(/\D/g, ''), 10) || 0), 0) + 1;
      const id = 'GM-' + String(next).padStart(4, '0');
      const ts = new Date().toISOString();
      const rate = parseFloat(s.rate), days = parseFloat(s.days), paid = parseFloat(s.paid);
      list.push({ id, ts, date: s.date, customer: s.customer, phone: s.phone, vehicle: s.vehicle, reg: s.reg, rate, days, by: session.name, prepaid, startDate: prepaid ? s.startDate : s.date, payments: [{ ts, date: s.date, amount: paid, by: session.name }] });
      saveHires(list);
      const bal = rate * days - paid;
      incomeView({ mode: 'new', savedMsg: `Saved as booking ${id}${prepaid ? ' (prepaid, hire starts ' + fmtD(s.startDate) + ')' : ''}. ${bal > 0.005 ? 'Balance still owed: ' + money(bal) + '.' : 'Paid in full.'}` });
    });
  } else {
    const bsel = $('booking');
    if (bsel) bsel.addEventListener('change', () => incomeView({ mode: 'pay', bookingId: bsel.value, date: val('date'), amount: val('amount') }));
    const amt = $('amount');
    const target0 = open.find((x) => x.id === state.bookingId);
    if (amt && target0) {
      const calc = () => { $('bal2').textContent = money(target0.balance - (parseFloat(amt.value) || 0)); };
      amt.addEventListener('input', calc); calc();
    }
    $('f').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const s = { mode, date: val('date'), bookingId: val('booking'), amount: val('amount') };
      const errors = {};
      const target = open.find((x) => x.id === s.bookingId);
      if (!s.date) errors.date = 'Please pick the date.';
      if (!target) errors.booking = 'Please choose which hire is being paid off.';
      const a = parseFloat(s.amount);
      if (!(a > 0)) errors.amount = 'Please type the amount being paid, for example 200.';
      else if (target && a > target.balance + 0.005) errors.amount = `That is more than the ${money(target.balance)} still owed. Please check the amount.`;
      if (Object.keys(errors).length) return incomeView({ ...s, errors });
      const list = hires();
      list.find((x) => x.id === s.bookingId).payments.push({ ts: new Date().toISOString(), date: s.date, amount: a, by: session.name });
      saveHires(list);
      const left = target.balance - a;
      incomeView({ mode: 'pay', savedMsg: left > 0.005 ? `Saved. ${target.customer} still owes ${money(left)} on booking ${target.id}.` : `Saved. ${target.customer} has now paid booking ${target.id} in full. Thank you.` });
    });
  }
}

function expenseView(state) {
  state = state || { date: today(), what: '', category: '', amount: '', vehicle: '', reg: '' };
  const e = state.errors || {};
  const catOpts = ['<option value="">Choose a category</option>'].concat(CATEGORIES.map((c) => `<option ${state.category === c ? 'selected' : ''}>${esc(c)}</option>`)).join('');
  app.innerHTML = header() + `<main class="page">
    <div><h1>Record money going out</h1><p class="lead">Use this for anything the business pays for: fuel, repairs, drivers, marketing, salaries. One entry per receipt.</p></div>
    <div class="grid">
      <form class="card form" id="f" novalidate>
        ${field('date', 'Date', 'The day you paid. It is on the receipt.', `<input id="date" type="date" value="${esc(state.date || today())}">`, e.date)}
        ${field('what', 'What was it for?', 'A few words so anyone reading the sheet knows what this payment was.', `<input id="what" type="text" placeholder="e.g. Fuel for the Prado" value="${esc(state.what || '')}">`, e.what)}
        ${field('vehicle', 'Which type of vehicle is it for? (optional)', 'Choose a vehicle if the cost belongs to one. Leave it as it is for general costs like marketing or salaries.', vehicleSelect(state, 'Not for a specific vehicle'), e.vehicle)}
        ${regField(state, e)}
        <div class="row2">
          ${field('category', 'Category', 'Pick the closest one. Not sure? Choose Other.', `<select id="category">${catOpts}</select>`, e.category)}
          ${field('amount', 'Amount (K)', 'The total on the receipt, in Kwacha. Numbers only.', `<input id="amount" type="number" inputmode="decimal" min="0" placeholder="0.00" value="${esc(state.amount || '')}">`, e.amount)}
        </div>
        <div class="stamp">This entry will be saved under your name, <b>${esc(session.name)}</b>, with today's date and time.</div>
        ${state.saved ? '<div class="ok" role="status">Saved. Thank you, your expense is recorded.</div>' : ''}
        <button class="btn" type="submit">Save</button>
      </form>
      <aside class="side">
        <div class="card"><h2>Quick guide</h2><p>Keep the receipt until you see the green Saved message.</p></div>
        <div class="card" style="margin-top:20px"><h2>Your latest entries</h2>${recent('expense')}</div>
      </aside>
    </div></main>`;
  wireHeader();
  wireVehicle();
  const val = (id) => $(id).value;
  $('f').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const s = { date: val('date'), what: val('what').trim(), vehicle: val('vehicle'), reg: normReg(val('reg')), category: val('category'), amount: val('amount') };
    const errors = {};
    if (!s.date) errors.date = 'Please pick the date.';
    if (s.what.length < 2) errors.what = 'Please say what it was for.';
    if (s.vehicle && !regOK(s.reg)) errors.reg = 'Please type the registration number (number plate), for example ABC 1234.';
    if (!s.category) errors.category = 'Please choose a category.';
    if (!(parseFloat(s.amount) > 0)) errors.amount = 'Please type the amount, for example 250.';
    if (Object.keys(errors).length) return expenseView({ ...s, errors });
    const rows = store.get('gm_expense');
    rows.push({ ts: new Date().toISOString(), date: s.date, what: s.what, vehicle: s.vehicle, reg: s.vehicle ? s.reg : '', category: s.category, amount: parseFloat(s.amount), by: session.name });
    store.set('gm_expense', rows);
    expenseView({ date: today(), what: '', category: '', amount: '', vehicle: '', reg: '', saved: true });
  });
}
