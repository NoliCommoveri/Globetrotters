// Registers the service worker. Loaded by both documents, and deliberately the
// whole of the client's involvement: the worker skips waiting on install and
// claims its clients on activate, so a new version is in place on the next
// launch with nothing here to arrange it (DESIGN.md §2).
//
// No update banner and no reload. A worker that reloads the page under someone
// is a worse bug than a screen that is one launch behind, and with the network
// answering first there is nothing stale on screen to correct.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // A failed registration is not a broken app — every screen still works
    // online, which is every screen. It is not worth a line on the status
    // region, and it must never reach the page as an unhandled rejection.
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
