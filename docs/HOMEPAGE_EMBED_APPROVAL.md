# Public homepage embedding — approved production exception (APPLIED)

Later 2026-11-02 follow-up: the user separately approved embedding the actual /app too. A separate app rule now preserves its dynamic nonce policy; see [APP_EMBED_APPROVAL.md](APP_EMBED_APPROVAL.md). The historical root-only boundary below describes the earlier approval, not the current app rule.

Latest public-language follow-up: the user explicitly requested ENG switching work in the same panel. On 2026-11-02 expanded existing public rule `e25350803a7746ae9432bd3f7c31bbe8` to `(http.host eq "dapulo.com" and http.request.uri.path in {"/" "/en" "/en/"})`. Dashboard confirms Active and two total free rules. This public-language change leaves the separately approved app nonce rule intact and excludes API/ERP. Historical root-only statements below describe the earlier approval. The public Korean/English pages contain no authenticated app data.

User request: after the central video ends, shift it left and show a mobile-width real dapulo.com homepage on the right; keep individual replay and homepage scrolling independent.

## Original production blocker

Read-only HTTP response for https://dapulo.com/ on 2026-11-02 reports:

- `X-Frame-Options: SAMEORIGIN`
- `Content-Security-Policy: object-src 'none'; base-uri 'self'; frame-ancestors 'self'`

These deliberately block embedding from https://junhoflow.github.io. The proposed PPCK iframe does not bypass them. The UI code is staged locally and tested using a conspicuously labelled synthetic layout fixture, not a modified response from the actual website.

## Applied change

`DAPULO_HOMEPAGE_EMBED_RULE.json` defines a narrowly scoped Cloudflare response-header Transform Rule:

- Exact host dapulo.com and exact path `/` only.
- Replace the public root's CSP with the same `object-src` and `base-uri` protections, adding only `https://junhoflow.github.io` to `frame-ancestors`.
- Remove SAMEORIGIN X-Frame-Options only for that same public root response, avoiding conflicts/legacy restrictions.
- Do not modify `/app`, `/api`, `/erp`, login, saved records, files, Workers, databases or application code. Other homepage languages/routes remain blocked unless separately approved.
- Origin-based authorization means any page on the owner's `junhoflow.github.io` origin can embed this public homepage, not only the `/dapulo-ppck-sync/` path. It does not permit arbitrary other GitHub users' origins.
- Preserve existing Cloudflare rules: append one exact-match rule only after reading current rule list; do not replace an entire ruleset. Cloudflare permission and available free quota still need checking before applying. No paid plan may be activated.
- Rollback: disable/remove only the added rule. The original source `_headers` protections then apply again.

The response-header rule avoids a new Dapulo app deployment and avoids publishing unrelated coral/Preview work from the shared checkout. If the account cannot apply this rule, choose a separately reviewed header-only release based on the current deployed artifact; do not deploy the dirty product checkout.

## User approval and actual application

The user explicitly approved “허용하고 실제 홈페이지까지 완성” on 2026-11-02. Applied through the existing signed-in Cloudflare dashboard (the existing Wrangler OAuth API request returned 403/9109; no token was logged or created).

- Account: existing Dapulo account; zone dapulo.com `ab5affe49bc6584547f5b8e137983c91`.
- Rule ID: `e25350803a7746ae9432bd3f7c31bbe8`.
- Name: PPCK public homepage embed — junhoflow Pages.
- Exact condition: `(http.host eq "dapulo.com" and http.request.uri.path eq "/")`.
- Status: Active; Free plan used 0/10 Transform Rules before this addition, now one active. No paid plan change.
- Root HEAD after apply: 200, frame-ancestors self + https://junhoflow.github.io, no X-Frame-Options, object/base protections preserved.
- /app, /app/login, /en and /erp HEAD after apply retain SAMEORIGIN and frame-ancestors self.
- No Pages/Worker/app deployment or database change occurred. Source _headers was not changed; this exact-root edge rule is a documented production override. Review it if the root CSP is changed in a future release.

## Approval boundary (now satisfied)

Dapulo AGENTS.md says: “Production deployment and remote DB migrations require separate approval.” The initial authorization covered this separate GitHub Pages demo, not a Dapulo production security-header exception. That separate explicit approval has now been received and the rule was applied. The security-audit skill was used for source-based guidance; it does not itself require user approval here.

PPCK UI deployment can now proceed through the existing feature-branch Pages workflow; actual live iframe content/scroll verification has passed in Chrome and WebKit (see TEST_REPORT_2026-11-02.md).

## Validation after approval

1. Read current Dapulo root headers and Cloudflare rules; apply only this rule.
2. Check root response allows the owner's Pages origin, and `/app` and other routes retain their existing frame protections.
3. Deploy prepared PPCK changes through its existing Pages workflow.
4. Verify the real iframe renders actual mobile homepage DOM/content in Chrome and WebKit, scrolls independently, and remains mounted while local replay runs. Confirm central reset restores the initial video-only view.
5. Record deployment/rule identifiers, first failures and actual results in HANDOFF.md.

References: https://www.w3.org/TR/CSP/ and https://developers.cloudflare.com/pages/configuration/headers/ .

## Completed verification

PPCK Pages run 41343753757 succeeded at commit 1ff3eaa7feb1497bdb4379de2e2558aaa2c1057c. Actual homepage rendering, 388px mobile viewport, fonts/images, independent scroll, repeated video playback without iframe reload, combined fullscreen and central reset passed in Chrome/WebKit. Physical device and venue Wi-Fi checks are still required for the event.
