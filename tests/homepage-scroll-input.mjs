import {mkdir,writeFile} from 'node:fs/promises';
const {chromium,webkit,expect}=await import(process.env.PLAYWRIGHT_MODULE||'@playwright/test');
const base=process.env.PPCK_URL||'https://junhoflow.github.io/dapulo-ppck-sync/';
const out=process.env.PPCK_EVIDENCE||`/private/tmp/ppck-scroll-input-${Date.now()}`;await mkdir(out,{recursive:true});
const browsers=[],contexts=[],pages=[],result={base,observations:[]};
async function make(browser,name,mobile=false){const ctx=await browser.newContext({viewport:{width:1180,height:820},hasTouch:mobile,isMobile:mobile});contexts.push({ctx,name});await ctx.tracing.start({screenshots:true,snapshots:true});const page=await ctx.newPage();pages.push({page,name});return{ctx,page};}
try{
 const ch=await chromium.launch({channel:'chrome',headless:true});browsers.push(ch);
 const wk=await webkit.launch({headless:true});browsers.push(wk);
 const {page:admin}=await make(ch,'admin');await admin.goto(new URL('admin.html',base).href);await admin.locator('#key').setInputFiles(process.env.PPCK_KEY);await expect(admin.locator('#reset')).toBeEnabled({timeout:30000});await admin.locator('#reset').click();
 const viewers=[];
 for(const[browser,name,touch]of[[ch,'chrome-wheel',false],[wk,'webkit-wheel',false],[ch,'chrome-touch',true]]){const viewer=await make(browser,name,touch);viewer.name=name;viewer.touch=touch;viewers.push(viewer);await viewer.page.goto(base);await expect(viewer.page.locator('#status')).toHaveText('Ready · Waiting for the presenter',{timeout:30000});}
 await viewers[2].page.locator('#full').click();await expect.poll(()=>viewers[2].page.evaluate(()=>document.fullscreenElement?.id)).toBe('presentation');
 await expect(admin.locator('#play')).toBeEnabled({timeout:30000});await admin.locator('#play').click();
 await Promise.all(viewers.map(({page})=>expect(page.locator('#status')).toHaveText('Demo complete',{timeout:20000})));
 for(const v of viewers){const p=v.page;await p.bringToFront();await expect(p.frameLocator('#homepage').getByRole('heading',{level:1})).toContainText('집중할수록',{timeout:30000});const f=p.frames().find(f=>f.url()==='https://dapulo.com/');await expect.poll(()=>p.locator('#homepage').evaluate(e=>e.getBoundingClientRect().width)).toBeGreaterThan(300);
 const box=await p.locator('#homepage').boundingBox();const x=box.x+box.width*.5,y=box.y+box.height*.7;
 const before=await f.evaluate(()=>({y:scrollY,scrollHeight:document.documentElement.scrollHeight,height:innerHeight,htmlOverflow:getComputedStyle(document.documentElement).overflow,bodyOverflow:getComputedStyle(document.body).overflow,touchAction:getComputedStyle(document.documentElement).touchAction}));
 const host=await p.locator('#homepage-panel').evaluate(e=>({inert:e.inert,pointer:getComputedStyle(e).pointerEvents,transform:getComputedStyle(e).transform,html:document.elementFromPoint(e.getBoundingClientRect().x+50,e.getBoundingClientRect().y+150)?.outerHTML.slice(0,140)}));
 if(v.touch){const cdp=await v.ctx.newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*22}]});}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 else{await p.mouse.move(x,y);await p.mouse.wheel(0,650);}
 try{await expect.poll(()=>f.evaluate(()=>scrollY),{timeout:5000}).toBeGreaterThan(100);result.observations.push({name:v.name,before,host,after:await f.evaluate(()=>scrollY),passed:true,fullscreen:await p.evaluate(()=>document.fullscreenElement?.id||null)});}catch(e){result.observations.push({name:v.name,before,host,after:await f.evaluate(()=>scrollY),outerScroll:await p.evaluate(()=>scrollY),passed:false,error:String(e)});}
 await p.screenshot({path:`${out}/${v.name}.png`,fullPage:true});
 }
 result.status=result.observations.every(x=>x.passed)?'passed':'failed';if(result.status==='failed')process.exitCode=1;
 await admin.locator('#reset').click();
}catch(e){result.status='failed';result.error=String(e);console.error(e);process.exitCode=1;for(const{page,name}of pages)await page.screenshot({path:`${out}/failure-${name}.png`,fullPage:true}).catch(()=>{});}
finally{await writeFile(`${out}/results.json`,JSON.stringify(result,null,2));for(const{ctx,name}of contexts){await ctx.tracing.stop({path:`${out}/trace-${name}.zip`});await ctx.close();}for(const b of browsers)await b.close();console.log(JSON.stringify(result));}
