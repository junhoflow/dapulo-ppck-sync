# PPCK deployment verification — 2026-11-02

Audience: https://junhoflow.github.io/dapulo-ppck-sync/

Presenter: https://junhoflow.github.io/dapulo-ppck-sync/admin.html

Final deployed commit: `bb6ded2741c8945125400d14f3108a288c6ac276`, successful [Pages run 41342791226](https://github.com/junhoflow/dapulo-ppck-sync/actions/runs/41342791226).

Working / deployed branch: `codex/ppck-completion-20261102`. No main merge or force-push.

## Latest follow-up — per-tablet replay

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
