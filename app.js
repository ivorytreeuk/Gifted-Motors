/* app.js = starts the site and switches between pages. Pages use the web address after the # sign,
   so the browser Back button works and managers can open a page straight from a link. */

const MANAGER_PAGES = {
  m: overviewView, 'm/orders': ordersView, 'm/spending': spendingView, 'm/vehicles': vehiclesView,
  'm/prepaid': prepaidView, 'm/owing': owingView, 'm/report': reportView
};

function render() {
  if (!session) return signIn();
  const r = route();
  if (r === 'expense') return expenseView();
  if (r.charAt(0) === 'm') {
    if (!session.mgr) return managerGate();
    return (MANAGER_PAGES[r] || overviewView)();
  }
  return incomeView();
}

window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
// If another window saves an entry, keep the overview and report up to date.
window.addEventListener('storage', () => { const r = route(); if (session && session.mgr && (r === 'm' || r === 'm/report')) render(); });
render();
