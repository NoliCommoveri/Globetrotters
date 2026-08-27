// Two paths and a callback. A router this small is a function, not a library —
// and the Worker has to know each path anyway, since it serves the same
// document for every one of them.

const listeners = new Set();

export const path = () => window.location.pathname;

function announce() {
  for (const fn of listeners) fn(path());
}

export function onRoute(fn) {
  listeners.add(fn);
}

export function go(to, { replace = false } = {}) {
  if (to === path()) return;
  window.history[replace ? 'replaceState' : 'pushState']({}, '', to);
  announce();
}

// Links carrying data-route navigate in place. Everything else — a real
// external link, a modified click, a middle click — is left to the browser.
export function start() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-route]');
    if (!link) return;
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    go(new URL(link.href).pathname);
  });

  window.addEventListener('popstate', announce);
}
