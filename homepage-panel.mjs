const presentation = document.getElementById('presentation');
const panel = document.getElementById('homepage-panel');
const homepage = document.getElementById('homepage');
export function showHomepage() {
  // Mount the real public homepage only after the first video ends; retain its scroll state during personal replays.
  if (!homepage.hasAttribute('src')) homepage.src = 'https://dapulo.com/';
  panel.hidden = false;
  panel.inert = false;
  presentation.classList.add('home-open');
}
export function hideHomepage() {
  presentation.classList.remove('home-open');
  panel.inert = true;
  panel.hidden = true;
}
