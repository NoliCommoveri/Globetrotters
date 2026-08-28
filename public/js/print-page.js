// The Print button on /print/:planId (DESIGN.md §16).
//
// The document is served by the Worker and its only job on a screen is to reach
// a print dialog. The browser's own way there is a share sheet on a phone, with
// Print buried among upload targets and missing from the menu entirely on some
// Android builds — so the page carries the button itself.
//
// The bar ships hidden and is unhidden here: without this file the button does
// nothing, and a dead button is worse than no button.
const bar = document.querySelector('.print-bar');

if (bar) {
  bar.hidden = false;
  bar.querySelector('.print-now').addEventListener('click', () => window.print());
}
