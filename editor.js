// Editing state stays in memory; the original CSV template is never mutated.
let wedgePreview=null;
function editDataset(){return datasets.find(d=>String(d.id)===$('edit-sample').value)}
function refreshEditor(){
 if(!$('edit-sample'))return;
 if(wedgePreview&&!datasets.includes(wedgePreview.dataset))wedgePreview=null;
 const selected=$('edit-sample').value;
 $('edit-sample').replaceChildren(...datasets.filter(d=>d.template).map(d=>new Option(d.name,String(d.id))));
 if([...$('edit-sample').options].some(o=>o.value===selected))$('edit-sample').value=selected;
 if(!$('edit-sample').options.length)$('edit-sample').add(new Option('请先导入 CSV',''));
}
function discardPreview(){if(wedgePreview){wedgePreview.dataset.data=wedgePreview.base;wedgePreview=null}}
function editParameters(){const d=editDataset();if(!d)throw Error('请先导入并选择 CSV 样本（Excel 和平均曲线不支持原格式导出）');return {d,start:PVB.num($('edit-start').value),end:PVB.num($('edit-end').value),value:PVB.num($('edit-value').value),kind:$('edit-kind').value,...settings()}}
function editMessage(text,error=false){$('edit-result').textContent=text;$('edit-result').classList.toggle('error',error)}
function previewWedge(){
 discardPreview();const p=editParameters();const result=PVB.adjustWedge(p.d.data,p.start,p.end,p.value,p.kind,p.H,p.n);
 const base=p.d.data;p.d.original??=base.map(p=>p.slice());p.d.data=result.data;p.d.visible=true;
 wedgePreview={dataset:p.d,base,result};render();
 editMessage(`预览：区间平均 ${result.before.toFixed(5)} → ${result.after.toFixed(5)} mrad；右侧厚度偏移 ${result.offset.toFixed(6)} mm。点击“应用调整”确认。`);
 return wedgePreview;
}
$('edit-preview').onclick=()=>{try{previewWedge()}catch(e){render();editMessage(e.message,true)}};
$('edit-apply').onclick=()=>{try{
 const preview=wedgePreview||previewWedge();const d=preview.dataset;d.history??=[];d.history.push(preview.base);wedgePreview=null;updateList();render();
 editMessage(`已应用 ${d.history.length} 步调整。区间平均楔角 ${preview.result.after.toFixed(5)} mrad；可以继续调整其他区间或导出。`);
}catch(e){editMessage(e.message,true)}};
$('edit-undo').onclick=()=>{discardPreview();const d=editDataset();if(!d)return;if(d.history?.length){d.data=d.history.pop();render();editMessage('已撤销上一步调整。')}else{render();editMessage('没有已应用的调整。')}};
$('edit-reset').onclick=()=>{discardPreview();const d=editDataset();if(d?.original){d.data=d.original.map(p=>p.slice());d.history=[];delete d.original;render();editMessage('已恢复原始厚度数据。')}};
$('edit-export').onclick=()=>{try{
 if(wedgePreview)throw Error('当前为预览，请先应用调整再导出');
 const d=editDataset();if(!d?.template)throw Error('请先选择导入的 CSV 样本');
 download(new Blob([PVB.exportTemplate(d.template,d.data)],{type:'text/csv'}),d.name.replace(/\.csv$/i,'')+'_adjusted.csv');
 editMessage('已导出调整后的厚度 CSV；仪器表头保持原始记录。');
}catch(e){editMessage(e.message,true)}};
function editChanged(){discardPreview();render();editMessage('参数已更新，点击“预览调整”查看效果。');try{const p=editParameters();const r=PVB.adjustWedge(p.d.data,p.start,p.end,p.value,p.kind,p.H,p.n);$('edit-summary').textContent=`当前区间平均 ${r.before.toFixed(5)} mrad；预期 ${r.after.toFixed(5)} mrad。`}catch(e){$('edit-summary').textContent=e.message}}
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
