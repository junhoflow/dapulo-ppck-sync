const presentation = document.getElementById('presentation');
const panel = document.getElementById('homepage-panel');
const homepage = document.getElementById('homepage');
const fullButton = document.getElementById('full');
const closeExpanded = document.getElementById('leave-expanded');
export const isIPad = /iPad/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let exitingNativeFullscreen = false;
function setExpanded(expanded) {
  if (expanded && !closeExpanded) return; // Older cached HTML can still display the inline split.
  presentation.classList.toggle('is-expanded', expanded);
  if (closeExpanded) closeExpanded.hidden = !expanded;
}
export function toggleExpandedHomepage() {
  setExpanded(!presentation.classList.contains('is-expanded'));
}
if (closeExpanded) closeExpanded.onclick = () => setExpanded(false);
export function showHomepage({ nativeVideoFullscreen = false } = {}) {
  panel.hidden = false;
  presentation.classList.add('home-open');
  if (!isIPad) { loadHomepage(); return; }
  // iPad native browser fullscreen can block touch scrolling in a cross-origin frame.
  // Keep video fullscreen for the first viewing, then use a large normal-document view for browsing.
  fullButton.textContent = 'Large view';
  const nativeElement = document.fullscreenElement || document.webkitFullscreenElement;
  if (nativeElement) {
    if (exitingNativeFullscreen) return;
    exitingNativeFullscreen = true;
    const exit = document.exitFullscreen?.bind(document) || document.webkitExitFullscreen?.bind(document) || document.webkitCancelFullScreen?.bind(document);
    Promise.resolve().then(() => exit?.()).then(() => {
      if (presentation.classList.contains('home-open')) { setExpanded(true); loadHomepage(); }
    }).catch(() => {
      if (presentation.classList.contains('home-open')) loadHomepage();
    }).finally(() => { exitingNativeFullscreen = false; });
    return;
  }
  if (nativeVideoFullscreen) setExpanded(true);
  loadHomepage();
}
function loadHomepage() {
  if (!homepage.hasAttribute('src')) {
    homepage.getBoundingClientRect();
    homepage.src = 'https://dapulo.com/en';
  }
}
export function hideHomepage() {
  setExpanded(false);
  presentation.classList.remove('home-open');
  panel.hidden = true;
  fullButton.textContent = 'Full screen';
}
