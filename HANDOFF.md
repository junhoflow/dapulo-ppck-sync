# Dapulo PPCK synchronization — handoff

Updated: 2026-11-02 (Asia/Seoul). Implementation complete; deployment and deployed QA pending.

- Repository: junhoflow/dapulo-ppck-sync, original main `18de2d552073e8bb302d9825db2ddf5af74f80da`.
- Working branch: `codex/ppck-completion-20261102`; isolated checkout `/private/tmp/dapulo-ppck-sync`.
- Original repo contained index.html, .nojekyll, .github/workflows/pages.yml only. No video, no separate admin page, no presence, no command authentication. Previous Actions run 41338050321 failed in configure-pages because Pages was disabled.
- GitHub Pages source enabled as GitHub Actions through the signed-in repository settings.
- Input found: `/Users/kimjunho/Downloads/Dapulo_12s_final_QR.mp4` (the file supplied in this chat; no 27233.mp4 input found).
- Plan: preserve static GitHub Pages + public EMQX MQTT architecture; add signed presenter commands, clock estimation, retained state recovery, full video preload, separate admin page, presence dashboard and deployed browser tests.
- Presenter private signing key exists only outside Git at `/private/tmp/Dapulo-PPCK-presenter-key.json`. DO NOT COMMIT, upload or log it. Public key is in config.mjs. Admin imports it locally; it is never sent to MQTT.
- Tool setup: ffmpeg-static, mqtt, qrcode installed in `/private/tmp/ppck-tools`. ffprobe-static Darwin arm64 package is incorrectly x86_64 and cannot run on this Mac; use ffmpeg metadata instead.
- Remaining: implement, encode video, narrow tests, review, commit/push feature branch, deploy branch with Actions, deployed Chromium/WebKit tests, finalize handoff and user guide.
- Dapulo product checkout `/Users/kimjunho/vscode/dapulo` has extensive unrelated changes. No product files edited. No Dapulo production/Worker/DB changes authorized or needed.

## Checkpoint 1 — implementation

- Input is already H.264 (not HEVC), 1920×1080, 24 fps, 288 frames, 12.00 seconds, NO AUDIO STREAM. Losslessly remuxed with faststart to 27233.mp4 (10,662,594 bytes). Source/output video-packet SHA-256 match (see README). UI explicitly labels Silent demo.
- Implemented separate admin.html, ECDSA signing/verification, clock ping/pong, scheduled start/resume/restart, pause/reset, independent preload request, presence, retry, foreground readiness, retained-state recovery, full Blob download, fullscreen fallback and responsive English audience UI.
- `node --check audience.mjs`, `node --check presenter.mjs`, `node --test tests/protocol.test.mjs` (3/3), and git diff --check pass.
- Local HTTP/Chrome readiness gate passed. Live EMQX local Chrome admin + two isolated Chrome contexts passed: 1920×1080, duration 12, play/pause/reset; simultaneous sampled currentTime 0.3202 vs 0.3182 sec. No page errors. This does not measure physical tablet panels or prove Internet multi-device synchronization.
- Evidence: /private/tmp/ppck-local-evidence (not published). First server listen was blocked by sandbox, then started with reviewed escalation. No product failures in first local run.
- Fixed preload so it never changes a running timeline.
- Workflow deploys the feature branch directly (no main push/merge) with explicit public files only. Pages source now GitHub Actions.
- Next: commit reviewed feature files and push, inspect deployment, then deployed Chrome + WebKit, end/reload/network loss/auth rejection/responsive tests.
