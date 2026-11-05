/* live.js = talks to the Google script when API_URL is set in core.js.
   In demo mode (no address) none of this is used and entries stay in the browser. */

const uid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

async function api(action, payload) {
  const body = JSON.stringify(Object.assign({ action: action, token: session ? session.token : '' }, payload || {}));
  let res;
  try {
    // A plain text body keeps this a "simple" request, which Google web apps accept from any website.
    res = await fetch(API_URL, { method: 'POST', body: body, redirect: 'follow' });
  } catch (e) {
    const err = new Error('We could not reach the system. Please check your internet connection and press Save again. It is safe to press Save more than once: the same entry will not be recorded twice.');
    err.code = 'network';
    throw err;
  }
  let j;
  try { j = await res.json(); } catch (e) {
    const err = new Error('The system sent an unexpected reply. Please try again in a moment.');
    err.code = 'bad';
    throw err;
  }
  if (!j.ok) { const err = new Error(j.error || 'Something went wrong. Please try again.'); err.code = j.code || 'server'; throw err; }
  return j;
}

function applyConfig(j) {
  if (j.vehicles && j.vehicles.length) VEHICLES = j.vehicles;
  if (j.categories && j.categories.length) CATEGORIES = j.categories;
}

async function refreshData() {
  if (!LIVE) return;
  const j = await api(session.mgr ? 'getAll' : 'staffData');
  applyConfig(j);
  DATA.income = j.income || [];
  DATA.expense = j.expense || [];
  DATA.recentHires = j.recentHires || [];
  DATA.recentExpenses = j.recentExpenses || [];
  DATA.regs = j.regs || [];
  DATA.loaded = true;
  DATA.at = new Date().toISOString();
}

// Returns true when the problem was an ended session (the sign-in page is shown instead).
function handleApiError(e) {
  if (e && e.code === 'auth') {
    session = null; sess.set(null); DATA.loaded = false;
    signIn(e.message || 'Your session has ended. Please sign in again.');
    return true;
  }
  return false;
}
