# Dapulo PPCK synchronized tablet demo

Audience: https://junhoflow.github.io/dapulo-ppck-sync/

Presenter: https://junhoflow.github.io/dapulo-ppck-sync/admin.html

## Presentation day (five steps)

1. Open the presenter page on a laptop/phone and import the separately supplied `Dapulo-PPCK-presenter-key.json`. Keep one presenter tab open. Refreshing it requires importing the key again.
2. Open the audience URL/QR on every tablet. The entire 10.7 MB video is downloaded into memory; wait for **Fully downloaded**, then tap **Get ready** once. A refreshed audience page needs another tap.
3. Check the presenter dashboard: all intended tablets must be connected, ready, clock-synchronized and in the foreground. Set each tablet's screen timeout/rotation; optionally enter full screen. Rehearse on the venue network.
4. Press **3초 뒤 전체 재생**. It resumes from the current timeline; **처음부터 다시 재생** starts at zero with a fresh three-second countdown. Use **일시정지** and **전체 초기화** as needed.
5. The audience sees a thank-you screen at the end. Keep the presenter open for replay. If a tablet loses its connection, wait for automatic reconnection and check its dashboard state before proceeding.

## Architecture and protection

GitHub Pages serves the HTML/JS and H.264 video directly. No screen sharing, account, install, payment, Firebase, or application server is required. The existing free public EMQX WebSocket MQTT broker relays small control/status messages only. MQTT.js is vendored locally with its license, avoiding a runtime CDN dependency. No private account token or signing key is published.

Only ECDSA P-256 signed states and clock replies matching `config.mjs` are accepted by audience clients. The private key is imported into a non-extractable CryptoKey held only in the presenter tab's memory; it is not sent to the broker or saved in localStorage. The admin URL is separate and not linked from the audience UI. Knowing it or the public MQTT topic cannot authorize a playback command. The source and admin HTML are still public: separation is not secrecy.

The public broker has no availability SLA and no private topic ACL. An adversary can interfere with availability or spoof audience status counts; those reports are operational indicators, not authenticated device identities. No personal data is requested: only random per-page device IDs, media/visibility/readiness and timing information are published. Freshness/sequence checks reject duplicate or older states within a page; retained commands expire after 12 hours. A new key/session should be generated for a later event. Do not distribute the private key to the audience or commit it to Git.

Detailed tested results and limitations: [verification report](docs/TEST_REPORT_2026-11-02.md).

## Synchronization and recovery

The presenter signs a timeline with a common start time three seconds in the future. Each tablet performs ping/pong clock estimation against the presenter and selects the smallest recent RTT sample. The video is local in memory before readiness. Reports include RTT, the applied command sequence, and the difference between the scheduled time and `video.play()` invocation. These are not measurements of panel refresh, frame presentation, or audible output. No frame-perfect guarantee is made; Wi-Fi asymmetry, browser scheduling, decoding and screen refresh affect actual results. Test each physical device before the pitch.

The newest signed playback state is MQTT-retained. A separate retained preload request is accepted for only 10 seconds and waits for clock synchronization; it never changes the playback timeline. Reconnection subscribes again, resynchronizes clocks, and applies the latest play/pause/reset state. Late play commands seek into the common timeline; a finished timeline shows the ending rather than restarting. Refresh downloads from the browser cache/network again and requires a new user gesture; **ready is never persisted across reloads**. The start/restart buttons require every currently reported tablet to be ready, synchronized and visible. Dead presence expires after 15 seconds. Presence is unretained and reported every two seconds. Keep a separate count of the tablets you actually handed out.

## Media verification

Input supplied: `Dapulo_12s_final_QR.mp4` (not a HEVC source). It is already H.264 High, 1920×1080, yuv420p, 24 fps, 288 frames, exactly 12 seconds. It has **no audio stream**. The published `27233.mp4` is a lossless remux with MP4 `faststart`; there is no AAC conversion because there is no original sound to preserve. Source and output video packet SHA-256 match:

`39982eec2ce993f84690a06e86119d5ab611fbb3350f263f4191ad7e5cb9d327`

Size: 10,662,594 bytes, well below GitHub's 100 MiB regular file limit. GitHub Pages' documented soft bandwidth limit is 100 GB/month; a few judging tablets are a small fraction of that. Venue connectivity to `wss://broker.emqx.io:8084/mqtt` must be allowed. Public broker availability/capacity is not guaranteed.

## Development and deployment

No build step or npm runtime dependencies. Serve this directory over HTTP locally (secure context / localhost required for Web Crypto), then run `node --test tests/protocol.test.mjs`. The workflow publishes an explicit public-file allowlist and validates syntax/protocol tests. It triggers on `main` and the feature branch `codex/ppck-completion-20261102`; this branch can deploy without changing main. GitHub Pages source must be **GitHub Actions**. The `github-pages` environment must allow deployment from the publishing branch.

Physical iPad/Android, actual Safari, venue Wi-Fi, automatic lock/low-power mode, audio and physical panel synchronization require on-site testing. Playwright WebKit is engine coverage, not a claim of real iPad/Safari coverage. This supplied clip is silent on every device.

Official references: [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), [WebKit autoplay policy](https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/), [EMQX public broker](https://www.emqx.com/en/mqtt/public-mqtt5-broker).
