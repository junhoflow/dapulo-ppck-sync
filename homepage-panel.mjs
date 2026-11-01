const presentation = document.getElementById('presentation');
const panel = document.getElementById('homepage-panel');
const homepage = document.getElementById('homepage');
export function showHomepage() {
  // Mount the real public homepage only after the first video ends; retain its scroll state during personal replays.
  // Reveal and size the native scrolling frame before its document is loaded.
  // Loading inside an inert/hidden, transforming ancestor can leave mobile frame hit-testing stale.
  panel.hidden = false;
  presentation.classList.add('home-open');
  if (!homepage.hasAttribute('src')) {
    homepage.getBoundingClientRect();
    homepage.src = 'https://dapulo.com/';
  }
}
export function hideHomepage() {
  presentation.classList.remove('home-open');
  panel.hidden = true;
}
