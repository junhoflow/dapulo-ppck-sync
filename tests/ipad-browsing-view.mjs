import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
const {chromium,webkit,expect}=await import(process.env.PLAYWRIGHT_MODULE||'@playwright/test');
const base=process.env.PPCK_URL||'https://junhoflow.github.io/dapulo-ppck-sync/?v=ipad7';
const out=process.env.PPCK_EVIDENCE||`/private/tmp/ppck-ipad-view-${Date.now()}`;await mkdir(out,{recursive:true});
const result={base,scope:'iPad detection simulated on desktop browser engines; real homepage and native input; MQTT isolated; synthetic local end event',cases:[]};
const allowed=new Set(['index.html','style.css','audience.mjs','homepage-panel.mjs','config.mjs','protocol.mjs','connection.mjs','vendor/mqtt.min.js','first-frame.jpg','27233.mp4','app-icon.png']);
for(const[engine,name,ipad]of[[chromium,'chrome-ipad-branch-touch',true],[webkit,'webkit-ipad-branch-wheel',true],[chromium,'chrome-android-native-fullscreen-touch',false]]){
 let browser,context,page;const record={name};
 try{
  browser=await engine.launch({...(engine===chromium?{channel:'chrome'}:{}),headless:true});
  context=await browser.newContext({viewport:{width:1180,height:820},hasTouch:true,isMobile:engine===chromium,userAgent:ipad?'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1':'Mozilla/5.0 (Linux; Android 13; Tablet) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'});
  await context.tracing.start({screenshots:true,snapshots:true});page=await context.newPage();
  await page.addInitScript(({ipad})=>{Object.defineProperty(navigator,'platform',{get:()=>ipad?'MacIntel':'Linux armv8'});Object.defineProperty(navigator,'maxTouchPoints',{get:()=>5});},{ipad});
  await page.routeWebSocket('wss://broker.emqx.io:8084/mqtt',socket=>socket.onMessage(()=>{}));
  if(process.env.PPCK_LOCAL==='1')await page.route('https://junhoflow.github.io/dapulo-ppck-sync/**',async route=>{const u=new URL(route.request().url());const file=decodeURIComponent(u.pathname.slice('/dapulo-ppck-sync/'.length))||'index.html';if(!allowed.has(file))return route.continue();const ext=file.split('.').pop();const mime={html:'text/html; charset=utf-8',css:'text/css',mjs:'application/javascript',js:'application/javascript',jpg:'image/jpeg',mp4:'video/mp4'}[ext];return route.fulfill({status:200,contentType:mime,body:await readFile(new URL('../'+file,import.meta.url))});});
  await page.goto(base);await expect(page.locator('#loading')).toContainText('Fully downloaded',{timeout:30000});
  await page.locator('#full').click();await expect.poll(()=>page.evaluate(()=>document.fullscreenElement?.id)).toBe('presentation');
  await page.locator('video').evaluate(v=>v.dispatchEvent(new Event('ended')));
  await expect(page.frameLocator('#homepage').getByRole('heading',{level:1})).toContainText('집중할수록',{timeout:30000});
  if(ipad){await expect.poll(()=>page.evaluate(()=>document.fullscreenElement)).toBe(null);await expect(page.locator('#presentation')).toHaveClass(/is-expanded/);await expect(page.getByRole('button',{name:'Exit large view'})).toBeVisible();}
  else{assert.equal(await page.evaluate(()=>document.fullscreenElement?.id),'presentation');await expect(page.locator('#presentation')).not.toHaveClass(/is-expanded/);}
  const frame=page.frames().find(f=>f.url()==='https://dapulo.com/');await frame.evaluate(()=>document.fonts.ready);
  await expect.poll(()=>frame.evaluate(()=>[...document.images].filter(i=>{const r=i.getBoundingClientRect();return r.width>0&&r.height>0&&r.top<innerHeight&&r.bottom>0;}).every(i=>i.complete&&i.naturalWidth>0)),{timeout:15000}).toBe(true);
  const box=await page.locator('#homepage').boundingBox(),x=box.x+box.width*.5,y=box.y+box.height*.75;
  if(engine===chromium){const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*22}]});await page.evaluate(()=>new Promise(requestAnimationFrame));}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  else{await page.mouse.move(x,y);await page.mouse.wheel(0,650);}
  await expect.poll(()=>frame.evaluate(()=>scrollY),{timeout:5000}).toBeGreaterThan(100);
  record.scrollY=await frame.evaluate(()=>scrollY);record.nativeFullscreen=await page.evaluate(()=>document.fullscreenElement?.id||null);record.expanded=await page.locator('#presentation').evaluate(e=>e.classList.contains('is-expanded'));record.background=await page.locator('#presentation').evaluate(e=>getComputedStyle(e).backgroundColor);assert.equal(record.background,'rgb(0, 0, 0)');
  await page.screenshot({path:`${out}/${name}.png`,fullPage:true});
  await page.locator('#replay').click();await expect(page.locator('#status')).toHaveText('Replaying on this screen');assert.ok(await frame.evaluate(()=>scrollY)>100);
  if(ipad){assert.equal(await page.evaluate(()=>document.fullscreenElement),null);await page.getByRole('button',{name:'Exit large view'}).click();await expect(page.locator('#presentation')).not.toHaveClass(/is-expanded/);await page.getByRole('button',{name:'Large view',exact:true}).click();await expect(page.locator('#presentation')).toHaveClass(/is-expanded/);assert.equal(await page.evaluate(()=>document.fullscreenElement),null);}
  record.status='passed';
 }catch(e){record.status='failed';record.error=String(e);record.url=page?.url();process.exitCode=1;await page?.screenshot({path:`${out}/failure-${name}.png`,fullPage:true}).catch(()=>{});}
 finally{result.cases.push(record);await context?.tracing.stop({path:`${out}/trace-${name}.zip`});await browser?.close();}
}
result.status=result.cases.every(c=>c.status==='passed')?'passed':'failed';await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
