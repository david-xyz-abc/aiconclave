const $ = id => document.getElementById(id);
let authorization = null;
let controller = null;
let generation = 0;
let busy = false;

function signOut() {
  generation++;
  controller?.abort();
  authorization = null;
  busy = false;
  $('login-form').reset();
  $('signin').hidden = false;
  $('dashboard').hidden = true;
  $('logout').hidden = true;
  $('login-button').disabled = false;
  $('login-button').textContent = 'Sign in';
  for (const key of ['veg', 'nonVeg', 'present', 'unrecorded']) $(key).textContent = '—';
  $('login-form').elements.username.focus();
}

async function refresh(login = false) {
  if (busy || !authorization) return;
  busy = true;
  const version = generation;
  controller = new AbortController();
  const activeController = controller;
  const timeout = setTimeout(() => activeController.abort(), 15000);
  $('refresh').disabled = true;
  $('refresh').textContent = 'Updating…';
  try {
    const response = await fetch('/api/counts', { headers:{ Authorization:authorization }, cache:'no-store', signal:controller.signal });
    const data = await response.json();
    if (version !== generation) return;
    if (!response.ok) {
      if (response.status === 401) {
        signOut();
        $('login-error').textContent = data.error;
        return;
      }
      throw new Error(data.error || 'Unable to refresh counts.');
    }
    for (const key of ['veg', 'nonVeg', 'present', 'unrecorded']) {
      if (!Number.isSafeInteger(data.counts?.[key]) || data.counts[key] < 0) throw new Error('Unable to read meal counts.');
    }
    $('signin').hidden = true;
    $('dashboard').hidden = false;
    $('logout').hidden = false;
    $('login-form').reset();
    for (const key of ['veg', 'nonVeg', 'present', 'unrecorded']) $(key).textContent = data.counts[key].toLocaleString();
    $('status').textContent = `Updated ${new Date(data.updatedAt).toLocaleString()}`;
    $('data-error').textContent = '';
    $('login-error').textContent = '';
    if (login) $('title').focus();
  } catch (error) {
    if (version !== generation) return;
    $(login ? 'login-error' : 'data-error').textContent = login ? 'Could not sign in. Please retry.' : 'Update failed. Counts shown may be outdated. Retry with Refresh.';
    if (login) authorization = null;
  } finally {
    clearTimeout(timeout);
    if (version === generation) busy = false;
    if (version === generation) {
      $('refresh').disabled = false;
      $('refresh').textContent = 'Refresh';
      $('login-button').disabled = false;
      $('login-button').textContent = 'Sign in';
    }
  }
}

$('login-form').addEventListener('submit', event => {
  event.preventDefault();
  if (busy) return;
  const form = event.currentTarget;
  const bytes = new TextEncoder().encode(`${form.elements.username.value.trim()}:${form.elements.password.value}`);
  authorization = `Basic ${btoa(String.fromCharCode(...bytes))}`;
  $('login-button').disabled = true;
  $('login-button').textContent = 'Signing in…';
  refresh(true);
});
$('logout').addEventListener('click', signOut);
$('refresh').addEventListener('click', () => refresh());
setInterval(() => { if (!document.hidden) refresh(); }, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
