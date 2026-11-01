# App embedding follow-up — 2026-11-02 (APPLIED)

The user explicitly requested the actual Dapulo application continue inside the right mobile frame after pressing 내 산호 키우러 가기. They chose the embedded option over opening another tab. /app and all its child screens currently reject foreign framing. Initial failure evidence: /private/tmp/ppck-app-navigation-before-locator-fixed/blocked.json and blocked.png. An initial test locator used the wrong shortened label; its failure was preserved separately, then scoped to the real hero link.

## Narrow production change

Prepared docs/DAPULO_APP_EMBED_RULE.json adds a separate Cloudflare response-header Transform Rule. Match exact host dapulo.com plus /app or /app/ children, and only responses whose existing CSP contains the exact original frame-ancestors directive. Split/join replaces only that directive. All other original CSP directives, especially the fresh response nonce, script-src and worker-src, are retained. Conflicting X-Frame-Options is removed only on the same matched app responses. Existing public-root rule, /api and /erp remain untouched. No app assets, Worker deployment, database or records are changed.

The allowed origin is https://junhoflow.github.io, so all pages on that origin, not only this repository path, can frame the app. The browser same-origin policy continues to isolate the app DOM/data from the parent. This relaxes framing protection for that single trusted origin, not login checks or data authorization. The user approved the concrete rule with “허용하고 적용”. Applied through the existing signed-in Cloudflare dashboard. Rule ID `7cba8f1a7a6b426f9d767e9ae99001da`; name `PPCK app embed — preserve CSP nonce`; status Active. Free plan now uses two of ten Transform Rules; no paid service enabled.

## PPCK frame policy

Camera/microphone are delegated to the exact dapulo.com origin so the existing app can request permission through its normal explicit action. This does not grant a camera/microphone permission. Geolocation remains disabled. Downloads, modal dialogs and user-activated storage access may be requested by existing app features; top navigation remains blocked. Existing popups may escape sandbox for external login. OAuth providers and Safari third-party storage can still require the existing Open site link for a top-level session; do not claim embedded social login or physical camera validation unless tested.

## Rollback

Disable/remove only the new app embed rule. The source /app nonce policy and SAMEORIGIN then apply again. Root rule remains. Revert the PPCK iframe capability change independently if desired.

## Verification pending

Actual deployed PPCK → real hero CTA → real app guest UI and scoped interaction in Chrome/WebKit, iframe scrolling and personal replay preservation, app nonce policy, unaffected API/ERP. Do not send central playback commands to real tablets during tests.

Official rule function references: https://developers.cloudflare.com/ruleset-engine/rules-language/functions/#split and https://developers.cloudflare.com/ruleset-engine/rules-language/functions/#join .
