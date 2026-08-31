// Registers the service worker, and decides when a new one takes over.
//
// Loaded by both documents. Registration itself is four lines; the rest is the
// swap, which is the only part with a wrong answer: a new worker activating
// under a screen somebody is using reloads the page mid-tap, and one that waits
// for every tab to close never activates at all on a tablet that is never
// closed (DESIGN.md §2).

if ('serviceWorker' in navigator) {
  // The wall is read-only and nobody is holding it, so it takes an update the
  // moment one lands. The shell waits until it is out of sight.
  const isWall = document.body.classList.contains('wall');

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Fires only after the swap this file asked for, so it can reload without
    // asking what changed. The guard is for the swap racing itself.
    if (reloading) return;
    reloading = true;
    location.reload();
  });

  const takeIt = (registration) => {
    const waiting = registration.waiting;
    if (!waiting) return;
    if (isWall || document.visibilityState === 'hidden') waiting.postMessage('skip-waiting');
  };

  // `updateViaCache: 'none'` so this file is revalidated on every check rather
  // than served from the HTTP cache — otherwise a deploy can sit unseen for as
  // long as the browser holds the old copy.
  navigator.serviceWorker.register('/sw.js', { type: 'module', updateViaCache: 'none' })
    .then((registration) => {
      takeIt(registration);
      registration.addEventListener('updatefound', () => {
        registration.installing?.addEventListener('statechange', () => takeIt(registration));
      });

      // Two moments worth asking for a new worker: coming back to the app, and
      // going away from it — the second is what hands the swap to a shell that
      // is now hidden and can safely reload behind the user.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update();
        else takeIt(registration);
      });
    })
    // A failed registration is not a broken app: everything still works online,
    // which is every screen. It is not worth a line on the status region.
    .catch(() => {});
}
