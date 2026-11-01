import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const {chromium,webkit,expect}=await import(process.env.PLAYWRIGHT_MODULE||'@playwright/test');
const base=process.env.PPCK_URL||'https://junhoflow.github.io/dapulo-ppck-sync/?v=app8';
const out=process.env.PPCK_EVIDENCE||`/private/tmp/ppck-app-embed-${Date.now()}`;await mkdir(out,{recursive:true});
const results={base,scope:'Real Pages and real Dapulo app; isolated anonymous browser; local-only guest onboarding; MQTT disconnected and local synthetic ended event; no response substitution',cases:[]};
for(const [engine,name]of[[chromium,'chrome'],[webkit,'webkit']]){
 let browser,context,page;const r={name};
 try{
 browser=await engine.launch({...(engine===chromium?{channel:'chrome'}:{}),headless:true});context=await browser.newContext({viewport:{width:1180,height:820},hasTouch:true});await context.tracing.start({screenshots:true,snapshots:true});page=await context.newPage();const errors=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.routeWebSocket('wss://broker.emqx.io:8084/mqtt',s=>s.onMessage(()=>{}));
 await page.goto(base);await expect(page.locator('#loading')).toContainText('Fully downloaded',{timeout:30000});await page.locator('video').evaluate(v=>v.dispatchEvent(new Event('ended')));
 const f=page.frameLocator('#homepage');await expect(f.getByRole('heading',{level:1})).toContainText('집중할수록',{timeout:30000});
 const appResponse=page.waitForResponse(response=>new URL(response.url()).origin==='https://dapulo.com'&&new URL(response.url()).pathname==='/app'&&response.request().isNavigationRequest());
 await f.locator('#hero').getByRole('link',{name:'내 산호 키우러 가기',exact:true}).click();const response=await appResponse;
 const policy=response.headers()['content-security-policy'];assert.ok(policy.includes("frame-ancestors 'self' https://junhoflow.github.io;"));assert.ok(policy.includes("script-src 'self' 'nonce-"));assert.ok(policy.includes("script-src-attr 'none'"));assert.ok(policy.includes("worker-src 'self' blob:"));assert.equal(response.headers()['x-frame-options'],undefined);
 const nonce=policy.match(/'nonce-([^']+)'/)[1];assert.ok((await response.text()).includes(`nonce="${nonce}"`));
 await expect(f.getByRole('heading',{name:'나와 함께할 친구는?',exact:true})).toBeVisible({timeout:30000});
 await f.getByRole('button',{name:'다푸리',exact:true}).click();await expect(f.getByRole('button',{name:'다푸리',exact:true})).toHaveAttribute('aria-pressed','true');
 await f.getByRole('button',{name:'다음',exact:true}).click();await expect(f.getByRole('heading',{name:'어떤 공부를 하고 있나요?',exact:true})).toBeVisible();
 await f.getByRole('button',{name:'캐릭터 선택으로 돌아가기',exact:true}).click();await expect(f.getByRole('button',{name:'다푸리',exact:true})).toHaveAttribute('aria-pressed','true');
 await f.getByRole('button',{name:'다음',exact:true}).click();await expect(f.getByRole('heading',{name:'어떤 공부를 하고 있나요?',exact:true})).toBeVisible();
 const appFrame=page.frames().find(frame=>new URL(frame.url()).origin==='https://dapulo.com'&&new URL(frame.url()).pathname==='/app');r.innerWidth=await appFrame.evaluate(()=>innerWidth);assert.ok(r.innerWidth<450);r.appUrl=appFrame.url();if(engine===chromium){r.delegatedFeatures=await appFrame.evaluate(()=>Object.fromEntries(['camera','microphone','geolocation'].map(name=>[name,document.featurePolicy.allowsFeature(name)])));assert.equal(r.delegatedFeatures.camera,true);assert.equal(r.delegatedFeatures.microphone,true);assert.equal(r.delegatedFeatures.geolocation,false);}
 await page.locator('#replay').click();await expect(page.locator('#status')).toHaveText('Replaying on this screen');await expect(f.getByRole('heading',{name:'어떤 공부를 하고 있나요?',exact:true})).toBeVisible();
 await appFrame.evaluate(()=>location.reload());await expect(f.getByRole('heading',{name:'나와 함께할 친구는?',exact:true})).toBeVisible({timeout:30000});await expect(f.getByRole('button',{name:'다푸리',exact:true})).toHaveAttribute('aria-pressed','true');
 await f.getByRole('button',{name:'다음',exact:true}).click();await expect(f.getByRole('heading',{name:'어떤 공부를 하고 있나요?',exact:true})).toBeVisible();await f.getByRole('button',{name:'기타',exact:true}).click();await f.getByRole('button',{name:'나의 바다정원으로',exact:true}).click();await expect(f.getByRole('heading',{name:'나의 바다',exact:true})).toBeVisible({timeout:30000});await expect(f.getByRole('button',{name:'집중 시작',exact:true})).toBeEnabled();
 await f.getByRole('button',{name:'알림',exact:true}).click();await expect(f.getByRole('heading',{name:'받은 알림',exact:true})).toBeVisible();await f.getByRole('button',{name:'받은 알림 뒤로',exact:true}).click();await expect(f.getByRole('heading',{name:'나의 바다',exact:true})).toBeVisible();r.guestHomeAndNotifications=true;
 const frameErrors=errors.filter(e=>/refused to frame|violates.*frame-ancestors|refused to (execute|load).*script/i.test(e));assert.deepEqual(frameErrors,[]);r.scriptNoncePreserved=true;r.characterSelection=true;r.nextAndBack=true;r.localGuestChoiceSurvivesReload=true;r.personalReplayPreservesApp=true;
 await page.screenshot({path:`${out}/${name}-app.png`,fullPage:true});r.status='passed';
 }catch(e){r.status='failed';r.error=String(e);r.url=page?.url();process.exitCode=1;await page?.screenshot({path:`${out}/failure-${name}.png`,fullPage:true}).catch(()=>{});}
 finally{results.cases.push(r);await context?.tracing.stop({path:`${out}/${name}-trace.zip`});await browser?.close();}
}
results.status=results.cases.every(r=>r.status==='passed')?'passed':'failed';await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
