/* report.js = the financial report. It is rebuilt from the live records every time it is opened
   or the period changes, so it always reflects the latest entries. */

let repRng = newRange('12months');

function reportView() {
  app.innerHTML = mShell('Financial report', 'A report built from the latest records. It is rebuilt every time you open this page or change the period.', `
    <div class="card form noprint">
      ${rangeControl('rp', repRng)}
      <div class="btnrow"><button class="btn" id="rpdf" type="button">Download report (PDF)</button><button class="btn ghost" id="rcsv" type="button">Download the data (CSV)</button></div>
      <div class="help">PDF: a print window opens. Choose "Save as PDF" as the destination. On a phone, tap Share, then Save to Files. The CSV opens in Excel or Google Sheets.</div>
    </div>
    <div id="rep"></div>`, true);
  wireHeader();
  const draw = () => { $('rep').innerHTML = reportHTML(repRng); };
  wireRange('rp', repRng, draw);
  $('rpdf').addEventListener('click', () => window.print());
  $('rcsv').addEventListener('click', () => { const A = aggregate(repRng); downloadCSV('gifted-motors-financial-data.csv', ledgerCSVHead, A.L.map(ledgerCSVRow)); });
  draw();
}

function reportHTML(r) {
  const A = aggregate(r);
  const now = new Date();
  const ref = 'GM-FR-' + iso(now).replace(/-/g, '') + '-' + String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
  const latestTs = A.L.length ? A.L.map((x) => String(x.ts)).sort().pop() : '';

  const months = monthSpan(A.L, r);
  const hireCount = {}; A.hr.forEach((h) => { hireCount[monthKey(h.date)] = (hireCount[monthKey(h.date)] || 0) + 1; });
  let cum = 0;
  const mrows = months.map((k) => { const i = A.inM[k] || 0, o = A.outM[k] || 0; cum += i - o; return { k, hires: hireCount[k] || 0, i, o, net: i - o, cum }; });
  const qmap = {};
  mrows.forEach((m) => { const k = quarterKey(m.k); const x = qmap[k] || (qmap[k] = { k, hires: 0, i: 0, o: 0 }); x.hires += m.hires; x.i += m.i; x.o += m.o; });
  const qrows = Object.keys(qmap).map((k) => qmap[k]);

  const cats = Object.keys(A.byCat).map((k) => ({ k, n: A.byCat[k].n, total: A.byCat[k].total })).sort((a, b) => b.total - a.total);
  const vehs = Object.keys(A.byVeh).map((k) => ({ k, n: A.byVeh[k].n, total: A.byVeh[k].total })).sort((a, b) => b.total - a.total);
  const days = sum(A.hr, (h) => h.days), booked = sum(A.hr, (h) => h.total);
  const open = A.all.filter((h) => h.balance > 0.005).sort((a, b) => b.balance - a.balance);
  const pre = A.awaiting.slice().sort((a, b) => a.startDate.localeCompare(b.startDate));
  const staffMap = {}; A.L.forEach((x) => { staffMap[x.by] = (staffMap[x.by] || 0) + 1; });
  const staff = Object.keys(staffMap).sort((a, b) => staffMap[b] - staffMap[a]);
  const net = A.tin - A.tout;

  return `<article class="report">
    <div class="rhead">
      <img src="logo.png" alt="${esc(CONFIG.business)}">
      <div><div class="rtitle">Financial report</div><div class="rsub">Management report from live business records</div></div>
    </div>
    <div class="rsec">
      <div class="meta">
        <div><span>Business</span><b>${esc(CONFIG.business)}</b></div>
        <div><span>Registered name</span><b>${esc(CONFIG.legalName)}</b></div>
        ${CONFIG.regNo ? `<div><span>Registration number</span><b>${esc(CONFIG.regNo)}</b></div>` : ''}
        <div><span>Address</span><b>${esc(CONFIG.address)}</b></div>
        <div><span>Reporting period</span><b>${esc(rangeLabel(r))}</b></div>
        <div><span>Report generated</span><b>${esc(fmtDT(now.toISOString()))}</b></div>
        <div><span>Report reference</span><b>${esc(ref)}</b></div>
        <div><span>Includes entries up to</span><b>${latestTs ? esc(fmtDT(latestTs)) : 'No entries yet'}</b></div>
      </div>
    </div>
    <div class="rsec">
      <h2>Summary for the period</h2>
      <div class="rstats">
        ${stat('Money received', money(A.tin))}
        ${stat('Money spent', money(A.tout))}
        ${stat(net < 0 ? 'Net loss' : 'Net profit', money(net), 'dark')}
        ${stat('Hires started', A.hr.length)}
        ${stat('Days hired', days)}
        ${stat('Average daily rate', money(days ? booked / days : 0))}
      </div>
      <div class="rstats" style="margin-top:12px">
        ${stat('Customer balances outstanding', money(A.owed), 'warn', 'As at ' + esc(fmtD(today())))}
        ${stat('Prepayments held, hire not started', money(A.held), '', A.awaiting.length + ' booking' + (A.awaiting.length === 1 ? '' : 's') + ', as at ' + esc(fmtD(today())))}
      </div>
    </div>
    <div class="rsec">
      <h2>Money in and out, month by month</h2>
      ${vbars(months, [{ name: 'Money received', color: '#0E2A5B', map: A.inM }, { name: 'Money spent', color: '#E0A00B', map: A.outM }], 'Bar chart of money received and spent by month')}
    </div>
    <div class="rsec">
      <h2>Monthly statement</h2>
      ${mrows.length ? table(['Month', 'Hires|r', 'Money received|r', 'Money spent|r', 'Net|r', 'Running net|r'], mrows.map((m) => [esc(monthLabel(m.k)), m.hires, money(m.i), money(m.o), `<b>${money(m.net)}</b>`, money(m.cum)]),
        ['<b>Total</b>', `<b>${sum(mrows, (m) => m.hires)}</b>`, `<b>${money(A.tin)}</b>`, `<b>${money(A.tout)}</b>`, `<b>${money(net)}</b>`, '']) : '<div class="empty">No entries in this period.</div>'}
    </div>
    <div class="rsec">
      <h2>Quarterly summary</h2>
      ${qrows.length ? table(['Quarter', 'Hires|r', 'Money received|r', 'Money spent|r', 'Net|r'], qrows.map((q) => [esc(q.k), q.hires, money(q.i), money(q.o), `<b>${money(q.i - q.o)}</b>`])) : '<div class="empty">No entries in this period.</div>'}
      <div class="help" style="margin-top:8px">A quarter at the start or end of the period may be partial.</div>
    </div>
    <div class="rsec cols2">
      <div><h2>Money received by vehicle</h2>${vehs.length ? table(['Vehicle', 'Payments|r', 'Received|r', 'Share|r'], vehs.map((v) => [esc(v.k), v.n, money(v.total), pct(v.total, A.tin)])) : '<div class="empty">No income in this period.</div>'}${donut(vehs.map((v) => ({ label: v.k, value: v.total })), 'Pie chart of money received by vehicle')}</div>
      <div><h2>Money spent by category</h2>${cats.length ? table(['Category', 'Entries|r', 'Spent|r', 'Share|r'], cats.map((c) => [esc(c.k), c.n, money(c.total), pct(c.total, A.tout)])) : '<div class="empty">No spending in this period.</div>'}${donut(cats.map((c) => ({ label: c.k, value: c.total })), 'Pie chart of spending by category')}</div>
    </div>
    <div class="rsec">
      <h2>Customer balances outstanding</h2>
      ${open.length ? table(['Booking', 'Customer', 'Vehicle', 'Hire date', 'Total|r', 'Paid|r', 'Owed|r'], open.slice(0, 15).map((h) => [esc(h.id), esc(h.customer), vehCell(h.vehicle, h.reg), esc(fmtD(h.startDate)), money(h.total), money(h.paid), `<b>${money(h.balance)}</b>`]), ['', '', '', '', '', '<b>Total owed</b>', `<b>${money(A.owed)}</b>`]) + (open.length > 15 ? `<div class="help">Largest 15 of ${open.length} balances shown.</div>` : '') : '<div class="empty">No customer balances outstanding.</div>'}
    </div>
    <div class="rsec">
      <h2>Prepaid bookings not yet started</h2>
      ${pre.length ? table(['Booking', 'Customer', 'Vehicle', 'Hire starts', 'Prepaid|r', 'Balance|r'], pre.slice(0, 15).map((h) => [esc(h.id), esc(h.customer), vehCell(h.vehicle, h.reg), esc(fmtD(h.startDate)), money(h.paid), money(Math.max(0, h.balance))]), ['', '', '', '<b>Total held</b>', `<b>${money(A.held)}</b>`, '']) : '<div class="empty">No prepaid bookings waiting to start.</div>'}
    </div>
    <div class="rsec">
      <h2>How the records are kept</h2>
      <p>Every entry is saved with the name of the staff member who recorded it and the date and time it was entered. In this period, ${A.L.length} entr${A.L.length === 1 ? 'y was' : 'ies were'} recorded by ${staff.length} staff member${staff.length === 1 ? '' : 's'}${staff.length ? ': ' + staff.map((s) => esc(s) + ' (' + staffMap[s] + ')').join(', ') : ''}.</p>
      <h2 style="margin-top:18px">Basis of preparation</h2>
      <p>Money received is the payments actually collected, counted on the date of payment. Money spent is the expenses paid, counted on the date of payment. This is a management report prepared from the business's own records. It has not been audited or reviewed by an accountant, and it does not replace bank statements, receipts or formal accounts. Where a bank or investor asks for supporting evidence, provide this report together with bank statements for the same period.</p>
    </div>
    <div class="rsec sig">
      <div><div class="line"></div><span>${CONFIG.preparedBy ? 'Prepared by: ' + esc(CONFIG.preparedBy) : 'Name'}</span></div>
      <div><div class="line"></div><span>Signature</span></div>
      <div><div class="line"></div><span>Date</span></div>
    </div>
    <div class="rfoot">${esc(CONFIG.business)} · ${esc(CONFIG.contact)} · Report ${esc(ref)}</div>
  </article>`;
}
