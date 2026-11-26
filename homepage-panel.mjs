const presentation = document.getElementById('presentation');
const panel = document.getElementById('homepage-panel');
const homepage = document.getElementById('homepage');
const fullButton = document.getElementById('full');
const closeExpanded = document.getElementById('leave-expanded');
export const isIPad = /iPad/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
window.addEventListener('message', event => {
  if (event.origin !== 'https://dapulo.com' || event.source !== homepage?.contentWindow ||
    event.data?.type !== 'dapulo:presentation-context-request' ||
    typeof event.data.nonce !== 'string' || event.data.nonce.length > 80) return;
  event.source.postMessage({
    type: 'dapulo:presentation-context-reply',
    nonce: event.data.nonce,
    url: window.location.href,
  }, event.origin);
});

let fullscreenRejected = false;
const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;
function supportsDocumentFullscreen() {
  if (fullscreenRejected) return false;
  if (presentation.requestFullscreen) return document.fullscreenEnabled !== false;
  return !!presentation.webkitRequestFullscreen && document.webkitFullscreenEnabled !== false;
}
function updateFullscreenControls() {
  fullButton.textContent = fullscreenElement() ? 'Exit full screen'
    : presentation.classList.contains('home-open') && !supportsDocumentFullscreen() ? 'Large view' : 'Full screen';
  if (closeExpanded) closeExpanded.hidden = !fullscreenElement() && !presentation.classList.contains('is-expanded');
}
function setExpanded(expanded) {
  if (expanded && !closeExpanded) return;
  presentation.classList.toggle('is-expanded', expanded);
  updateFullscreenControls();
}
async function exitDocumentFullscreen() {
  const exit = document.exitFullscreen || document.webkitExitFullscreen || document.webkitCancelFullScreen;
  await exit?.call(document);
  updateFullscreenControls();
}
export function toggleExpandedHomepage() {
  setExpanded(!presentation.classList.contains('is-expanded'));
}
if (closeExpanded) closeExpanded.onclick = async () => {
  setExpanded(false);
  if (fullscreenElement()) await exitDocumentFullscreen();
};
document.addEventListener('fullscreenchange', updateFullscreenControls);
document.addEventListener('webkitfullscreenchange', updateFullscreenControls);

/** Run directly from the button's click, preserving the browser's user activation. */
export async function togglePresentationFullscreen(video, status) {
  try {
    if (fullscreenElement()) { await exitDocumentFullscreen(); return; }
    if (supportsDocumentFullscreen()) {
      const request = presentation.requestFullscreen || presentation.webkitRequestFullscreen;
      await request.call(presentation);
      setExpanded(false);
    } else if (presentation.classList.contains('home-open')) {
      toggleExpandedHomepage();
    } else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
    else status('Rotate your tablet for a larger view.');
  } catch {
    if (presentation.classList.contains('home-open')) {
      fullscreenRejected = true;
      setExpanded(true);
      status('Full screen unavailable · Showing large view');
    } else status('Full screen unavailable · Rotate your tablet for a larger view');
  }
}
export function showHomepage({ nativeVideoFullscreen = false } = {}) {
  panel.hidden = false;
  presentation.classList.add('home-open');
  // Only legacy video-only fullscreen must return inline for HTML siblings.
  // A supported document fullscreen keeps both the video and interactive iframe visible.
  if (isIPad && nativeVideoFullscreen && !fullscreenElement()) setExpanded(true);
  updateFullscreenControls();
  loadHomepage();
}
function loadHomepage() {
  if (!homepage.hasAttribute('src')) {
    homepage.getBoundingClientRect();
    homepage.src = 'https://dapulo.com/';
  }
}
export function hideHomepage() {
  setExpanded(false);
  presentation.classList.remove('home-open');
  panel.hidden = true;
  updateFullscreenControls();
}
