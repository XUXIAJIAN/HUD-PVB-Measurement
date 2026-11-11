const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true});try{const p=await b.newPage({acceptDownloads:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.PVB_TEST_URL||'http://127.0.0.1:8000/');await p.click('#edit-demo');
async function apply(a,z,v){await p.fill('#edit-start',String(a));await p.fill('#edit-end',String(z));await p.fill('#edit-value',String(v));await p.click('#edit-preview');await p.click('#edit-apply')}
await apply(100,300,.1);await apply(500,700,.05);await apply(200,600,-.02);
assert.equal(await p.locator('.adjustment-row').count(),3);
const original=await p.evaluate(()=>datasets[0].original),all=await p.evaluate(()=>datasets[0].data);
await p.locator('.adjustment-row').first().getByRole('button').click();
assert.deepEqual(await p.evaluate(()=>datasets[0].data),await p.evaluate(()=>PVB.applyAdjustments(datasets[0].original,datasets[0].history.slice(1))));
await p.locator('.adjustment-row').first().getByRole('button').click();assert.deepEqual(await p.evaluate(()=>datasets[0].data),all);
await p.click('#edit-undo');assert.equal(await p.locator('.adjustment-row.inactive').count(),1);
await p.click('#edit-export');assert.ok(await p.locator('#export-confirm').evaluate(e=>e.open));assert.match(await p.locator('#export-summary').innerText(),/保留 2 段/);
await p.click('#export-cancel');assert.deepEqual(await p.evaluate(()=>datasets[0].data),await p.evaluate(()=>PVB.applyAdjustments(datasets[0].original,datasets[0].history)));
await p.click('#edit-export');const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#export-confirm-save')]);assert.match(dl.suggestedFilename(),/_adjusted.csv$/);
await p.click('#edit-reset');assert.deepEqual(await p.evaluate(()=>datasets[0].data),original);assert.equal(await p.locator('.adjustment-row').count(),0);assert.deepEqual(errors,[]);console.log('PASS browser: three intervals, independent undo/restore, undo latest, final summary, cancel, confirmed download, reset.');}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
