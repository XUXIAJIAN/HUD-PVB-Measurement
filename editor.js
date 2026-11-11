// Editing state stays in memory; the original CSV template is never mutated.
let wedgePreview=null;
let nextAdjustmentId=1;
function editDataset(){return datasets.find(d=>String(d.id)===$('edit-sample').value)}
function refreshEditor(){
 if(!$('edit-sample'))return;
 if(wedgePreview&&!datasets.includes(wedgePreview.dataset))wedgePreview=null;
 const selected=$('edit-sample').value;
 $('edit-sample').replaceChildren(...datasets.filter(d=>d.template).map(d=>new Option(d.name,String(d.id))));
 if([...$('edit-sample').options].some(o=>o.value===selected))$('edit-sample').value=selected;
 if(!$('edit-sample').options.length)$('edit-sample').add(new Option('请先导入 CSV',''));
 renderAdjustments();
}
function discardPreview(){if(wedgePreview){wedgePreview.dataset.data=wedgePreview.base;wedgePreview=null}}
function editParameters(){const d=editDataset();if(!d)throw Error('请先导入并选择 CSV 样本（Excel 和平均曲线不支持原格式导出）');return {d,start:PVB.num($('edit-start').value),end:PVB.num($('edit-end').value),value:PVB.num($('edit-value').value),kind:$('edit-kind').value,...settings()}}
function editMessage(text,error=false){$('edit-result').textContent=text;$('edit-result').classList.toggle('error',error)}
function previewWedge(){
 discardPreview();const p=editParameters();const result=PVB.adjustWedge(p.d.data,p.start,p.end,p.value,p.kind,p.H,p.n);
 const base=p.d.data;p.d.original??=base.map(p=>p.slice());p.d.data=result.data;p.d.visible=true;
 wedgePreview={dataset:p.d,base,result,parameters:{start:p.start,end:p.end,value:p.value,kind:p.kind,H:p.H,n:p.n}};render();
 editMessage(`预览：区间平均 ${result.before.toFixed(5)} → ${result.after.toFixed(5)} mrad；右侧厚度偏移 ${result.offset.toFixed(6)} mm。点击“应用调整”确认。`);
 return wedgePreview;
}
$('edit-preview').onclick=()=>{try{previewWedge()}catch(e){render();editMessage(e.message,true)}};
$('edit-apply').onclick=()=>{try{
 const preview=wedgePreview||previewWedge();const d=preview.dataset;d.history??=[];d.history.push({...preview.parameters,id:nextAdjustmentId++,delta:preview.result.delta,active:true});rebuildAdjustments(d);wedgePreview=null;updateList();render();
 editMessage(`已应用 ${d.history.length} 步调整。区间平均楔角 ${preview.result.after.toFixed(5)} mrad；可以继续调整其他区间或导出。`);
}catch(e){editMessage(e.message,true)}};
function rebuildAdjustments(d){
 const data=PVB.applyAdjustments(d.original||d.data,d.history||[]);
 d.data=data;
}
function toggleAdjustment(d,record){
 discardPreview();record.active=!record.active;
 try{rebuildAdjustments(d)}catch(e){record.active=!record.active;render();editMessage(e.message,true);return}
 render();renderAdjustments();editMessage(record.active?'已恢复该段调整，其他调整保留。':'已撤销该段调整，其他调整保留。');
}
function renderAdjustments(){
 const list=$('edit-history');if(!list)return;list.replaceChildren();const d=editDataset();
 const records=d?.history||[];
 $('edit-history-count').textContent=`已应用 ${records.filter(r=>r.active).length} 段 / 共 ${records.length} 条记录`;
 for(const record of records){
  const row=document.createElement('div');row.className='adjustment-row'+(record.active?'':' inactive');
  const text=document.createElement('span');text.textContent=`#${record.id} · ${record.start}–${record.end} mm · ${record.kind==='target'?'目标平均':'增量'} ${record.value} mrad${record.active?'':'（已撤销）'}`;
  const button=document.createElement('button');button.textContent=record.active?'撤销此段':'恢复此段';button.onclick=()=>toggleAdjustment(d,record);row.append(text,button);list.append(row);
 }
}
$('edit-undo').onclick=()=>{discardPreview();const d=editDataset();const record=d?.history?.findLast(r=>r.active);if(record)toggleAdjustment(d,record);else{render();editMessage('没有已应用的调整。')}};
$('edit-reset').onclick=()=>{discardPreview();const d=editDataset();if(d?.original){d.data=d.original.map(p=>p.slice());d.history=[];delete d.original;render();renderAdjustments();editMessage('已恢复原始厚度数据。')}};
$('edit-export').onclick=()=>{try{
 if(wedgePreview)throw Error('当前为预览，请先应用调整再导出');
 const d=editDataset();if(!d?.template)throw Error('请先选择导入的 CSV 样本');
 const records=(d.history||[]).filter(r=>r.active);
 $('export-summary').textContent=`样本：${d.name}\n数据点：${d.data.length}\n保留 ${records.length} 段调整：\n`+records.map(r=>`#${r.id}：${r.start}–${r.end} mm，${r.kind==='target'?'目标平均':'增量'} ${r.value} mrad`).join('\n')+'\n已撤销的调整不计入导出。保留原始表头和厚度小数位。';
 $('export-confirm').showModal();
}catch(e){editMessage(e.message,true)}};
$('export-cancel').onclick=()=>$('export-confirm').close();
$('export-confirm-save').onclick=()=>{try{
 const d=editDataset();if(!d?.template||wedgePreview)throw Error('数据状态已变化，请重新确认');
 download(new Blob([PVB.exportTemplate(d.template,d.data)],{type:'text/csv'}),d.name.replace(/\.csv$/i,'')+'_adjusted.csv');
 $('export-confirm').close();editMessage('已确认并导出所有保留的调整；仪器表头保持原始记录。');
}catch(e){$('export-confirm').close();editMessage(e.message,true)}};
function editChanged(){discardPreview();render();renderAdjustments();editMessage('参数已更新，点击“预览调整”查看效果。');try{const p=editParameters();const r=PVB.adjustWedge(p.d.data,p.start,p.end,p.value,p.kind,p.H,p.n);$('edit-summary').textContent=`当前区间平均 ${r.before.toFixed(5)} mrad；预期 ${r.after.toFixed(5)} mrad。`}catch(e){$('edit-summary').textContent=e.message}}
for(const id of ['edit-start','edit-end','edit-value','edit-kind'])$(id).addEventListener('input',()=>{$('edit-slider').value=$('edit-value').value;editChanged()});
$('edit-slider').oninput=()=>{$('edit-value').value=$('edit-slider').value;editChanged()};
$('edit-sample').onchange=editChanged;
for(const id of ['window','smooth'])$(id).addEventListener('change',editChanged);
refreshEditor();

$('edit-demo').onclick=()=>{
 const name='SEKG65_data20261111144355.csv';
 let d=datasets.find(d=>d.name===name);
 if(!d){const bytes=Uint8Array.from(atob(window.PVB_EDIT_SAMPLE),c=>c.charCodeAt(0));add(name,PVB.csv(new TextDecoder().decode(bytes)),PVB.csvTemplate(bytes));d=datasets[datasets.length-1]}
 discardPreview();$('edit-sample').value=String(d.id);render();editChanged();
};
