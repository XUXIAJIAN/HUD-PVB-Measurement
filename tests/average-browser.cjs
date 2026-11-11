const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true});try{
const p=await b.newPage({acceptDownloads:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.PVB_TEST_URL||'http://127.0.0.1:8000/');
const file=(name,points)=>({name,mimeType:'text/csv',buffer:Buffer.from('[Header]\r\n"DATA",'+points.length+'\r\n[Data]\r\n'+points.map(([x,y])=>x+','+y.toFixed(4)).join('\r\n')+'\r\n')});
await p.locator('#files').setInputFiles([file('A.csv',[[0,.5],[250,.55],[500,.6],[750,.65],[1000,.7]]),file('B.csv',[[0,.7],[250,.75],[500,.8],[750,.85],[1000,.9]]),file('C.csv',[[0,.9],[250,.95],[500,1],[750,1.05],[1000,1.1]])]);
await p.waitForFunction(()=>datasets.length===3);const sources=await p.evaluate(()=>datasets.map(d=>d.data));
await p.click('#average-open');await p.click('#average-create');assert.equal(await p.evaluate(()=>editDataset().aggregate),true);
const mean=await p.evaluate(()=>editDataset().data);mean.forEach(([x,y],i)=>assert.ok(Math.abs(y-(.7+i*.05))<1e-12));
assert.equal(await p.locator('#edit-format option').count(),4);
await p.fill('#edit-start','250');await p.fill('#edit-end','750');await p.selectOption('#edit-kind','target');await p.fill('#edit-value','0.4');await p.click('#edit-preview');assert.match(await p.locator('#edit-result').innerText(),/0.40000/);await p.click('#edit-apply');
await p.fill('#edit-start','500');await p.fill('#edit-end','1000');await p.selectOption('#edit-kind','delta');await p.fill('#edit-value','0.02');await p.click('#edit-apply');assert.equal(await p.locator('.adjustment-row').count(),2);
await p.locator('.adjustment-row').first().getByRole('button').click();assert.deepEqual(await p.evaluate(()=>datasets.slice(0,3).map(d=>d.data)),sources);
await p.click('#edit-export');assert.match(await p.locator('#export-summary').innerText(),/平均来源/);const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#export-confirm-save')]);const stream=await dl.createReadStream();let exported='';for await(const chunk of stream)exported+=chunk;assert.ok(exported.startsWith('[Header]\r\n"DATA",5\r\n[Data]\r\n'));assert.equal(exported.trim().split('\r\n').length,8);
await p.click('#edit-reset');assert.deepEqual(await p.evaluate(()=>editDataset().data),mean);
await p.click('#clear');await p.locator('#files').setInputFiles([file('D.csv',[[0,.5],[500,.6],[1000,.7]]),file('E.csv',[[100,.6],[600,.7],[900,.8]])]);await p.waitForFunction(()=>datasets.length===2);await p.click('#average-open');await p.click('#average-create');assert.equal(await p.locator('#edit-format option').count(),1);assert.equal(await p.locator('#edit-format').inputValue(),'plain');
await p.click('#edit-export');const [plain]=await Promise.all([p.waitForEvent('download'),p.click('#export-confirm-save')]);const rs=await plain.createReadStream();let text='';for await(const c of rs)text+=c;assert.match(text,/Position_mm,Thickness_mm/);assert.equal(text.trim().split('\r\n').length,5);
assert.deepEqual(errors,[]);console.log('PASS: batch import three curves, exact mean, automatic selection, target and multi-interval edits, independent undo, unchanged sources, template export, reset, unequal-grid mean and lossless two-column fallback.');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
