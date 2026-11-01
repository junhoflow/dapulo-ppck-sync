# PPCK deployment verification — 2026-11-02

Audience: https://junhoflow.github.io/dapulo-ppck-sync/

Presenter: https://junhoflow.github.io/dapulo-ppck-sync/admin.html

Final deployed commit: `1b21af22d0e905c81690dbde302ae4e30bf1b0de`, successful [Pages run 41347854601](https://github.com/junhoflow/dapulo-ppck-sync/actions/runs/41347854601).

Working / deployed branch: `codex/ppck-completion-20261102`. No main merge or force-push.

## Latest English by default

The user requested the first revealed homepage default to English. Lazy frame URL and toolbar Open site both start at https://dapulo.com/en; cache version en10. No new Cloudflare policy or Dapulo app/Worker/DB change. Video-first and end-to-split timing unchanged.

Actual deployed en10 tests/english-presentation.mjs PASSED Chrome + WebKit: without clicking a language link, English h1 appears and iframe src is /en; Open site href also /en. KOR/ENG round trip, English hero→actual app, English touch260/wheel600 scroll, zero-inset fullscreen, black backgrounds/exact app icon and three responsive layouts pass. Evidence /private/tmp/ppck-en10-deployed; actual responses unchanged, MQTT isolated, local synthetic ended event only. Other existing homepage harness expectations were updated to English but not rerun for this URL-only follow-up. Syntax/protocol3/3/diff checks pass. Physical tablet verification is not claimed.

## Previous English navigation and presentation appearance

User requested ENG work inside the right frame, remove the initial navy fullscreen band, use black split margins, and put the actual app icon before Dapulo. Expanded only the existing public-home rule to exact /, /en and /en/; the app nonce rule and API/ERP are unchanged. /en200 now allows PPCK; /en/308 redirects to /en with the same frame policy. Still two free rules. No Dapulo app assets/Worker/DB deployment.

Audience normal/native-fullscreen/iPad CSS-large backgrounds are black. Initial native fullscreen removes its24px inset and screen border/corners. Video remains uncropped with object-fit contain; aspect-ratio letterboxing is black. Header uses the exact live-manifest PNG (/dapulo-icon-192.png?v=20260902-rounded), published as app-icon.png, SHA256 d5700536954de18962d224ed159c285db9a589f45f43ed274441cfbe0f6fbe44. Pages artifact explicitly stages this PNG and validates it exists.

Actual deployed present9 tests/english-presentation.mjs PASSED Chrome + WebKit: icon fully decoded192px, published PNG hash matches, audience background black, initial fullscreen video x0/y0/1180×820 matches viewport with padding0 and radius0, fullscreen split black, actual ENG→English→KOR→Korean→ENG round trip, real English page scrolling (Chrome trusted touch260; WebKit wheel600), English hero Grow my coral opens real /app, and1024×768/844×390/390×844 layouts have no horizontal overflow. No header stripping/site substitution; MQTT disconnected and local synthetic ending only. Evidence /private/tmp/ppck-present9-deployed; initial fullscreen and English split screenshots inspected.

Predeploy failures were test selector errors: visible ENG/KOR are accessible English/한국어, then a footer Open app link was incorrectly scoped to header. Preserved /private/tmp/ppck-present9-predeploy and /private/tmp/ppck-present9-predeploy-locator-fixed; neither called all-pass. Corrected selectors from actual HTML to language accessible names and hero Grow my coral. Final actual deployed run passed. Syntax/protocol3/3/diff checks passed. Physical devices remain unverified by the agent. Actual present9 iPad-specific compatibility test also PASSED: simulated iPad Chrome exits native to black large view with touch260; simulated iPad WebKit exits native to black large view with wheel650; Android Chrome retains black native fullscreen with touch259. Replay/Close/reopen still work. Evidence /private/tmp/ppck-present9-ipad-compat. These simulate detection/desktop engine behavior, not physical tablets.

## Previous actual app inside the mobile panel

User requested the actual /app continue inside the same right panel and separately approved the concrete Cloudflare exception. Added app-only rule `7cba8f1a7a6b426f9d767e9ae99001da`, preserving per-response nonce and all original script/worker directives while allowing only https://junhoflow.github.io in frame-ancestors. Root rule unchanged. /erp retains SAMEORIGIN; API health remains401. No Dapulo app assets/Worker/DB deployment. See APP_EMBED_APPROVAL.md and DAPULO_APP_EMBED_RULE.json.

Actual deployed app8 `tests/app-embedded.mjs` PASSED Chrome + Playwright WebKit: real hero link → real app, 388px mobile viewport, character selection, next/back, reload retaining local guest selection, completing local-only guest onboarding to 나의 바다, notifications open/back, and personal video replay preserving app. Actual HTML nonce matches the response CSP. Chrome camera/mic capability delegation true; geolocation false. No camera/mic permission granted and no capture tested. Evidence /private/tmp/ppck-app-embedded-final; Chrome screenshot inspected. Initial abbreviated-label locator failure preserved at /private/tmp/ppck-app-navigation-before; corrected scoped hero locator confirmed original block. Preliminary urllib header request got Cloudflare403; normal curl and real browser results confirm behavior.

Physical tablet app use, embedded social login, recording and authenticated focus/data saving remain unverified. Test anonymous state stays in isolated local browser storage; no existing account data changed or live playback command sent. Syntax, protocol3/3 and diff checks pass.

## Previous iPad native-fullscreen workaround

User physically confirmed Galaxy Tab scrolling works, but iPad fails specifically in native fullscreen. On iPad video end, exit native browser fullscreen before loading the real homepage and use a CSS large normal-document split view. Initial video fullscreen remains available; subsequent homepage Large view does not enter native fullscreen. Close control exits Large view. Android keeps native fullscreen. No Dapulo production source/settings/Worker/DB change. Cache version: ipad7.

Actual deployed entry https://junhoflow.github.io/dapulo-ppck-sync/?v=ipad7 passed `tests/ipad-browsing-view.mjs`:

| Simulated device branch / engine | Fullscreen after ending | Real homepage input | Result |
| --- | --- | --- | --- |
| iPad detection / Chrome | Native exits; CSS large view | Trusted CDP swipe, scrollY259 | PASS |
| iPad detection / Playwright WebKit | Native exits; CSS large view | Mouse wheel, scrollY650 | PASS |
| Android / Chrome | Native fullscreen retained | Trusted CDP swipe, scrollY260 | PASS |

Replay preserves scroll. iPad Close/Large view controls stay outside native fullscreen. Evidence /private/tmp/ppck-ipad7-deployed; WebKit screenshot visually inspected. MQTT is isolated and a synthetic local ended event opens the panel, avoiding commands to real user tablets. Actual dapulo.com response is not substituted or modified. iPad detection is simulated on desktop engines; this is not a real iPadOS touch/fullscreen test. Physical iPad verification has been requested and remains pending. Galaxy success is the user's report, not an agent-operated hardware test.

## Previous tablet touch-scroll fix

The user reported finger scrolling failed on both iPad and Android. Earlier window.scrollTo-based tests proved scroll-state changes, not native finger input; that gap is explicitly acknowledged.

Compatibility changes: show/size the iframe before URL navigation; remove redundant inert toggling and retained transform/grid animation around the frame; add a fixed native scrolling wrapper with explicit iframe height, scrolling=yes and vertical touch pan allowance. Version entry CSS/audience/homepage module URLs so a tablet reload cannot keep the earlier setup. Latest entry: https://junhoflow.github.io/dapulo-ppck-sync/?v=touch6 . No Dapulo app/Worker/DB or production-header changes in this fix.

Actual input results (real homepage, not fake scrollTo): WebKit wheel0→650 passed; Chrome mobile trusted CDP finger swipe in combined fullscreen passed (0→260 and timed gesture0→128). Final versioned-entry Chrome mobile fullscreen gesture0→138 passed at /private/tmp/ppck-touch-version6-final. These are browser emulation/engine results, NOT physical tablet certification.

Initial and after-test Chrome desktop wheel checks intermittently stayed at0; aggregate runs are preserved as failed, not called all-pass. A separate focused event-instrumented Chrome wheel case advanced650. No deterministic explanation of that intermittent first desktop wheel is claimed. Evidence: /private/tmp/ppck-scroll-input-before, /private/tmp/ppck-scroll-input-after, /private/tmp/ppck-scroll-input-isolated, /private/tmp/ppck-scroll-wheel-event-diagnosis. An auxiliary unisolated diagnostic lost the panel to a retained central reset, so it is excluded from scroll conclusions. The final diagnostic harness uses separate browsers, disconnects only the test page's MQTT and opens the panel via a local synthetic ended event, avoiding interference with user-controlled tablets. Real homepage and real gesture input remain untouched.

This earlier generic device-confirmation status is superseded by the latest iPad section: user reports Galaxy works, iPad native fullscreen fails; revised iPad verification is pending.

## Earlier follow-up — real mobile homepage beside video

On natural video end, the video moves left and the actual mobile-width https://dapulo.com/ homepage opens on the right. Personal replay keeps that homepage mounted with its scroll intact; central reset restores video-only viewing. Narrow phone portrait stacks the panels. Fullscreen now encloses both.

The original live homepage blocked framing via SAMEORIGIN/frame-ancestors self. After the user's explicit approval, added exactly one Cloudflare Free-plan response-header rule for host dapulo.com and path /, allowing self + https://junhoflow.github.io and removing root X-Frame-Options. Rule ID e25350803a7746ae9432bd3f7c31bbe8. No Dapulo app/Worker/DB deployment. Live HEAD verification confirms /app, /app/login, /en and /erp still have SAMEORIGIN/self. Existing Wrangler OAuth read failed 403/9109, so the existing signed-in Cloudflare browser was used without creating any credential. Exact policy, scope and rollback are in HOMEPAGE_EMBED_APPROVAL.md and DAPULO_HOMEPAGE_EMBED_RULE.json.

Actual Pages Chrome + Playwright WebKit `tests/homepage-real.mjs` PASSED with the REAL homepage (no route substitution, copy, proxy or header stripping): actual Korean h1, images/fonts, iframe width 388, mobile media query true, document heights 3184/3055, independent scroll to 650, scroll survives personal replay and its next ending, exactly one homepage document load per viewer, combined Chrome fullscreen, four viewport layouts without outer horizontal overflow, and central reset.

Local synthetic layout/scroll tests also passed on both engines, with fixture clearly labelled as not live dapulo.com. First fixture run failed due missing UTF-8 charset in the test-only page; corrected fixture and retained the first failure at /private/tmp/ppck-home-panel-fixture. Successful fixture runs: /private/tmp/ppck-home-panel-fixture-rerun and /private/tmp/ppck-home-panel-fullscreen-fixture. Actual deployed evidence: /private/tmp/ppck-real-home-deployed. Actual screenshots inspected; raw traces remain local. One Chrome full-page capture after viewport resize shows a stitched header artifact at its bottom; normal 1180 screenshot and WebKit/other sizes are clean, and no duplicate DOM was introduced.

JS syntax, protocol tests 3/3, and diff check pass. Physical iPad/Android, native iPadOS fullscreen, venue Wi-Fi, and navigating from homepage into app/login are not claimed verified. English navigation (/en) is outside the approved root-only embedding exception; Open site opens the full website separately when needed.

## Earlier follow-up — per-tablet replay

First viewing remains controlled by the presenter. At the final held video frame, a centered Watch again button allows each viewer to start/repeat their own playback, without publishing any central control command. Other tablets keep their own positions. Reconnect/visibility/clock updates for the same presenter command do not interrupt personal playback. A newer signed central reset/restart still applies to every screen.

Local `tests/individual-replay.mjs` passed with Chrome + WebKit: initial replay hidden and first frame paused, central first play, center-positioned button at end, A replaying while B remains paused, independent staggered replay (3.674 sec vs 0.013 sec), continued local playback through visibility and offline/reconnect, button returns after repeat end, and central reset restores both screens. Actual Pages Chrome + WebKit verification also PASSED all scenarios, with independent positions 3.666 sec vs 0.010 sec. No audience replay caused another screen to start or seek. Local evidence: `/private/tmp/ppck-replay-local`; deployed evidence: `/private/tmp/ppck-replay-deployed`. Screenshots/Playwright traces preserved and the center-button screenshot visually inspected. Syntax checks, protocol tests 3/3 and diff check passed. Physical tablet coverage remains as limited below.

## Earlier follow-up — first/last video frame behavior

The user replaced the original waiting/countdown/thank-you flow. Earlier deployed commit was `1a16d9f6575f81fc8f9c45df8a133b2cad6b709f`, [successful Pages run 41342461360](https://github.com/junhoflow/dapulo-ppck-sync/actions/runs/41342461360).

Actual Pages test `tests/video-frames.mjs` passed on Chrome and Playwright WebKit, with no audience gesture: first frame visible and paused at time 0, no overlays or countdown, presenter start observed after 803 ms, pause keeps video visible, natural end holds the last decoded frame at 11.999 seconds, and reset returns to time 0. The entire source remains 1080p/12 seconds and silent. The shared-clock delivery buffer is 600 ms and has no visible countdown. If a browser restricts autoplay, a small Enable playback button appears below the video.

First and final screenshots were inspected. Local and deployed traces/results: `/private/tmp/ppck-frames-local` and `/private/tmp/ppck-frames-deployed`. Syntax checks, protocol tests 3/3 and diff check passed. This scoped follow-up did not rerun the earlier full six-viewer/connection suites; the earlier results below describe their tested baseline. In particular, the old Get ready/new-gesture/countdown/thank-you descriptions below are superseded.

## Earlier verified baseline

| Item | Evidence / result |
| --- | --- |
| Audience, presenter and video deployment | HTTP 200 at actual GitHub Pages origin; separate noindex admin page. |
| Video identity and quality | Full H.264 High 1920×1080, yuv420p, 24 fps, 288 frames, 12.00 s. Lossless faststart remux; source/output video packet hashes match. Deployed file SHA-256 matches local upload. |
| Audio | Supplied source has **no audio stream**. Output is intentionally silent and UI says Silent demo. Audible playback cannot be verified from this source. |
| Audience preparation | Whole 10,662,594-byte video downloaded into a Blob before Get ready. Genuine click primes playback; no stored ready flag. |
| Cross-engine playback | Chrome 156.0.8078.74 + Playwright WebKit 26.6 loaded 1080p/12 s video and responded to presenter controls. |
| Common-clock start | Three-second scheduled start; clock ping/pong corrects client offsets. Three repeated Chrome/WebKit starts had software currentTime spreads 3.38, 9.42, 14.24 ms. |
| Six simultaneous viewers | Six isolated Chrome contexts: software position spread 8.50 ms in one run. One viewer had a simulated +120-second clock offset and was corrected. |
| Controls | Start, pause, resume, restart from zero, reset, preload and natural thank-you end screen. Preload does not interrupt playback. |
| Reconnection | Audience offline → online restores latest retained reset; presenter reconnects with key retained in tab memory. |
| Refresh | WebKit reload reconnects and requires a new Get ready click before it counts as ready. |
| Authorization | Unkeyed admin controls disabled. Signed key imported locally. Actual forged high-sequence unsigned pause command sent to the public MQTT topic was ignored by all six playing viewers. Protocol tests reject malformed/unsigned payloads. |
| Download recovery | Intentionally injected first-request HTTP 503 recovered through presenter preload; Get ready became available. |
| Fullscreen | Chrome entered fullscreen from actual button click. Native device fullscreen behavior remains untested. |
| Layout | Separate non-fullscreen viewport test at 390×844, 844×390, 1024×768 and 1180×820: Get ready/Fullscreen in viewport; no horizontal overflow; screenshots visually inspected. |
| Automated checks | JS syntax checks, git diff --check and protocol tests 3/3 passed. No full Dapulo app build/regression needed for this independent static project. |

## Failures preserved and fixed

1. Original deployment (run 41338050321) failed at configure-pages because Pages was disabled. Enabled GitHub Actions as source.
2. First feature deployment attempt (run 41340209488) was rejected by the environment's main-only branch rule. Added only the exact feature branch; kept existing main rule and protections. Attempt 2 succeeded.
3. First deployed browser run failed at offline detection: the browser's offline transition did not close the existing WebSocket. Added explicit offline end / online reconnect and a bounded publish acknowledgement wait. Affected deployed flow passed afterward.
4. Extended test deliberately returned HTTP 503 for one video request; an early preload could arrive before subscription/clock readiness. Retained the latest signed preload for a 10-second valid window and applied it after clock sync. Affected six-viewer/preload/auth test passed afterward.
5. First responsive screenshots remained in headless fullscreen after Escape. They were excluded from normal-layout evidence; added explicit exit assertion and an independent normal-viewport test. Final short-landscape screen centered through CSS only.

## Measurement limits / physical rehearsal

All automated contexts ran on one Mac and Internet connection. Software currentTime samples are near-concurrent remote browser reads, not high-speed-camera measurements of actual displayed frames or sound. Broker clock round trips were approximately 294–583 ms in the six-viewer run. Scheduling three seconds ahead avoids tying start directly to individual message arrival times, but network asymmetry, device decoding, OS scheduling and panel refresh still matter. Frame-perfect synchronization is not promised.

Not directly tested: physical iPad/iPadOS Safari, Android tablets, venue Wi-Fi/firewall, screen lock/low-power policies, physical panel timing, actual hardware audio/fullscreen behavior, or concurrent audiences beyond six. The supplied clip has no audio. Do an on-site rehearsal with all intended tablets.

EMQX is a free public test broker with no private topic ACL or availability guarantee. Signatures protect control authenticity; broker denial of service or forged audience presence remain possible. The UI labels presence as device-reported. No paid plan or billing resource was activated. Video traffic goes directly from Pages to each viewer.

## Reproduction and local evidence

Tests are committed under `tests/`. Set `PLAYWRIGHT_MODULE` to the installed Playwright module entry, `MQTT_MODULE` for the scale test, and `PPCK_KEY` to the private local key. Set `PPCK_EVIDENCE` to a unique output directory. Never run the live control tests during a presentation.

- Cross-engine successful run: `/private/tmp/ppck-deployed-run2`; first failed run `/private/tmp/ppck-deployed-run1`.
- Six-viewer successful run: `/private/tmp/ppck-scale-run2`; first injected-failure run `/private/tmp/ppck-scale-run1`.
- Independent normal-layout evidence: `/private/tmp/ppck-responsive-final`; final CSS deployment confirmed again at `/private/tmp/ppck-responsive-release`.
- Raw screenshots and Playwright traces stay local; they are not published to Pages or committed.
- Persistent user-delivery artifacts (private key, QR, screenshots, summarized results): `/Users/kimjunho/.codex/visualizations/2026/11/01/01a1987d-62ff-71c2-bd8d-998300239acf/ppck-delivery/`.

Official limits and behavior references: [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), [WebKit autoplay](https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/), [EMQX public broker](https://www.emqx.com/en/mqtt/public-mqtt5-broker).
