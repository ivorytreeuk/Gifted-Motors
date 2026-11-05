/* app.js = starts the site and switches between pages. Pages use the web address after the # sign,
   so the browser Back button works and managers can open a page straight from a link. */

const MANAGER_PAGES = {
  m: overviewView, 'm/orders': ordersView, 'm/spending': spendingView, 'm/vehicles': vehiclesView,
  'm/prepaid': prepaidView, 'm/owing': owingView, 'm/report': reportView
};

function loadingScreen(msg) { app.innerHTML = `<main class="loading"><div class="spin" aria-hidden="true"></div><div>${esc(msg || 'Loading the latest figures…')}</div></main>`; }

let renderToken = 0;
function render(forceFresh) {
  if (!session) return signIn();
  const r = route();
  const needData = LIVE && (forceFresh || !DATA.loaded);
  if (needData) return loadAndRender();
  return draw();
}
async function loadAndRender() {
  const my = ++renderToken;
  loadingScreen();
  try { await refreshData(); } catch (e) {
    if (my !== renderToken) return;
    if (handleApiError(e)) return;
    app.innerHTML = `<main class="loading"><div class="errbox" role="alert">${esc(e.message)}</div><button class="btn" id="retry" type="button">Try again</button></main>`;
    $('retry').addEventListener('click', loadAndRender);
    return;
  }
  if (my === renderToken) draw();
}
function draw() {
  const r = route();
  if (r === 'expense') return expenseView();
  if (r.charAt(0) === 'm') {
    if (!session.mgr) return managerGate();
    return (MANAGER_PAGES[r] || overviewView)();
  }
  return incomeView();
}

window.addEventListener('hashchange', () => { render(route() === 'm' || route() === 'm/report'); window.scrollTo(0, 0); });
// Demo mode only: if another window saves an entry, keep the overview and report up to date.
if (!LIVE) window.addEventListener('storage', () => { const r = route(); if (session && session.mgr && (r === 'm' || r === 'm/report')) render(); });
render();
