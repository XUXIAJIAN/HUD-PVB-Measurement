const $=id=>document.getElementById(id),colors=['#087f9c','#e18226','#7761ba','#cc527c','#279768','#5269cc'];
let datasets=[],mode='slope',nextId=1,currentBook=null,importQueue=Promise.resolve(),viewRange=[250,800],yRange=[0,1];
const eyeColors=['#008caa','#bc7b14','#9461c2'];
[[338,465],[408,532],[469,620]].forEach((e,i)=>{const r=document.createElement('div');r.className='eyerow';r.innerHTML=`<span class="eyetag" style="color:${eyeColors[i]}">EB${i+1}</span><input aria-label="EB${i+1} 左边界" type="number" step="any" value="${e[0]}"><input aria-label="EB${i+1} 右边界" type="number" step="any" value="${e[1]}">`;$('eyes').append(r);r.querySelectorAll('input').forEach(x=>x.addEventListener('input',()=>render()))});
function say(s,error=false){$('message').textContent=s;$('message').classList.toggle('error',error)}
function settings(){const H=PVB.num($('window').value),n=Number($('smooth').value);if(!Number.isFinite(H)||H<=0)throw Error('请输入大于0的斜率窗口');const eyes=[...$('eyes').children].map((r,i)=>{const [l,h]=[...r.querySelectorAll('input')].map(e=>PVB.num(e.value));if(!Number.isFinite(l)||!Number.isFinite(h)||l>=h)throw Error(`EB${i+1} 需要有效边界，且左边界小于右边界`);return[l,h]});return{H,n,eyes}}
function nextCurveColor(){const used=new Set(datasets.map(d=>d.color.toLowerCase()));const available=colors.find(c=>!used.has(c));if(available)return available;let seed=nextId,color;do{color='#'+((seed++*2654435761)>>>8).toString(16).padStart(6,'0')}while(used.has(color));return color}
function add(name,data,template=null){datasets.push({id:nextId++,name,data,template,visible:true,color:nextCurveColor()});updateList();if(typeof refreshEditor==='function')refreshEditor()}
function updateList(){if(typeof refreshEditor==='function')refreshEditor();$('datasets').replaceChildren();datasets.forEach(d=>{const row=document.createElement('div'),toggle=document.createElement('input'),dot=document.createElement('input'),s=document.createElement('span'),b=document.createElement('button');toggle.type='checkbox';toggle.className='dataset-toggle';toggle.checked=d.visible;toggle.ariaLabel='显示曲线 '+d.name;toggle.title='显示／隐藏此样本曲线';toggle.onchange=()=>{d.visible=toggle.checked;updateList();render()};row.classList.toggle('dataset-hidden',!d.visible);dot.type='color';dot.className='curve-color';dot.value=d.color;dot.ariaLabel='修改曲线颜色 '+d.name;dot.title='修改曲线、名称和连接线颜色';dot.oninput=()=>{d.color=dot.value;render()};s.textContent=`${d.name} · ${d.data.length} 点`;s.onclick=()=>{d.visible=!d.visible;updateList();render()};s.title=d.aggregate?'平均厚度曲线；来源：'+d.sources.join('、'):'点击显示／隐藏曲线';b.textContent='×';b.ariaLabel='移除 '+d.name;b.onclick=()=>{datasets=datasets.filter(x=>x.id!==d.id);updateList();render()};row.append(toggle,dot,s,b);$('datasets').append(row)})}
function averageName(name){return 'AVE_'+name.replace(/^(?:AVE_)+/i,'')}
function annotationText(name){return Array.from(name).reduce((lines,c,i)=>{if(i%48===0)lines.push('');lines[lines.length-1]+=c;return lines},[]).map(line=>line.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')).join('<br>')}
function fmt(v){return Number.isFinite(v)?v.toFixed(4):'—'}
function render(){let st;try{st=settings()}catch(e){say(e.message+'。图表仍显示上次有效结果。',true);return}const traces=[],shapes=[],annotations=[];$('readings').replaceChildren();let count=0;
 datasets.forEach(d=>{if(d.original){const original=PVB.evaluator(d.original,st.H,st.n,mode);traces.push({x:d.original.map(p=>p[0]),y:d.original.map(p=>{const v=original(p[0]);return Number.isFinite(v)?v:null}),name:d.name+' · 调整前',type:'scatter',mode:'lines',visible:d.visible?true:'legendonly',line:{color:d.color,width:1,dash:'dot'},opacity:0.55,connectgaps:false,hovertemplate:'调整前 %{y:.5f}<extra></extra>'})}const f=PVB.evaluator(d.data,st.H,st.n,mode),ys=d.data.map(p=>f(p[0]));count+=ys.filter(Number.isFinite).length;traces.push({x:d.data.map(p=>p[0]),y:ys.map(v=>Number.isFinite(v)?v:null),name:d.name,legendgroup:String(d.id),visible:d.visible?true:'legendonly',type:'scatter',mode:'lines',connectgaps:false,line:{color:d.color,width:2},hovertemplate:'%{x:.2f} mm<br>%{y:.4f} '+(mode==='slope'?'mrad':'mm')+'<extra>%{fullData.name}</extra>'});st.eyes.forEach(([l,h],i)=>{const xs=[l,(l+h)/2,h],vals=xs.map(f),row=document.createElement('tr');[d.name,`EB${i+1} · ${l}–${h}`,...vals.map(fmt)].forEach(t=>{const td=document.createElement('td');td.textContent=t;row.append(td)});$('readings').append(row);traces.push({x:xs,y:vals.map(v=>Number.isFinite(v)?v:null),legendgroup:String(d.id),visible:d.visible?true:'legendonly',type:'scatter',mode:'markers',marker:{color:d.color,size:7,symbol:'diamond'},showlegend:false,name:d.name+' / EB'+(i+1),hovertemplate:'%{x:.2f} mm<br>%{y:.4f}<extra>%{fullData.name}</extra>'})})});
 st.eyes.forEach(([l,h],i)=>{shapes.push({type:'rect',xref:'x',yref:'paper',x0:l,x1:h,y0:0,y1:1,fillcolor:eyeColors[i],opacity:0.055,line:{width:0},layer:'below'});[l,h].forEach(x=>shapes.push({type:'line',xref:'x',yref:'paper',x0:x,x1:x,y0:0,y1:1,line:{color:eyeColors[i],width:1,dash:'dot'}}));annotations.push({xref:'x',yref:'paper',x:(l+h)/2,y:1.02+i*0.065,text:`EB${i+1} · ${l}–${h} mm`,showarrow:false,font:{color:eyeColors[i],size:12}})});
 const averages=datasets.filter(d=>d.aggregate&&d.visible);
 const chartWidth=Math.max(240,$('chart').clientWidth-85);
 const legendRows=Math.max(1,Math.ceil(datasets.reduce((sum,d)=>sum+Math.min(chartWidth,Array.from(d.name).length*7+55),0)/chartWidth));
 const bottomMargin=85+legendRows*24;
 const plotHeight=420;
 const chartHeight=plotHeight+75+bottomMargin;
 $('chart').style.height=chartHeight+'px';
 averages.forEach((d,i)=>{
  const trace=traces.find(t=>t.legendgroup===String(d.id)&&t.mode==='lines');
  const range=viewRange||[d.data[0][0],d.data[d.data.length-1][0]];
  const points=trace.x.map((x,j)=>[x,trace.y[j]]).filter(([x,y])=>Number.isFinite(y)&&x>=range[0]&&x<=range[1]&&y>=yRange[0]&&y<=yRange[1]);
  const target=range[0]+(range[1]-range[0])*(i+1)/(averages.length+1);
  const point=points.reduce((best,p)=>!best||Math.abs(p[0]-target)<Math.abs(best[0]-target)?p:best,null);
  const label={name:'average-'+d.id,text:annotationText(d.name),align:'left',font:{color:d.color,size:12},bgcolor:'#fff',bordercolor:d.color,borderpad:4,xanchor:'center',yanchor:'middle'};
  if(!point)return;
  const position=d.labelPositions?.[mode]||{ax:range[0]+(range[1]-range[0])*0.5,ay:yRange[1]-(yRange[1]-yRange[0])*(0.15+(i%5)*0.15)};
  Object.assign(label,{xref:'x',yref:'y',x:point[0],y:point[1],axref:'x',ayref:'y',...position,showarrow:true,arrowhead:0,arrowwidth:1,arrowcolor:d.color});
  annotations.push(label);
 });
 if(!datasets.length)annotations.push({xref:'paper',yref:'paper',x:0.5,y:0.45,text:'导入 CSV / Excel 查看曲线',showarrow:false,font:{size:19,color:'#8095a5'}});
 Plotly.react('chart',traces,{height:chartHeight,margin:{l:65,r:20,t:75,b:bottomMargin},paper_bgcolor:'#fff',plot_bgcolor:'#fff',font:{family:'Segoe UI, Microsoft YaHei, sans-serif',color:'#425b6d'},xaxis:{title:'原始位置 / mm',range:viewRange||undefined,autorange:!viewRange,gridcolor:'#edf1f5',zeroline:false},yaxis:{range:yRange,autorange:false,title:mode==='slope'?'近似楔角 / mrad':'厚度 / mm',gridcolor:'#e7eef3',zerolinecolor:'#bdcdd8'},hovermode:'x unified',legend:{orientation:'h',y:-0.2,yanchor:'top',groupclick:'togglegroup'},shapes,annotations,uirevision:JSON.stringify([mode,viewRange,yRange,datasets.map(d=>d.id)])},{edits:{annotationTail:true},responsive:true,scrollZoom:true,displaylogo:false,modeBarButtonsToRemove:['lasso2d','select2d'],toImageButtonOptions:{filename:'PVB曲线',scale:2}});
 $('unit').textContent=mode==='slope'?'近似楔角 / mrad':'厚度 / mm';$('slope').classList.toggle('active',mode==='slope');$('thickness').classList.toggle('active',mode==='thickness');say(datasets.length?`${datasets.length} 个样本（显示 ${datasets.filter(d=>d.visible).length} 个） · ${mode==='slope'?st.H+' mm窗口':'厚度视图'} · ${st.n===1?'未平滑':st.n+'点平滑'} · ${count} 个有效曲线点${count?'':'，请检查窗口或数据范围'}`:'导入测量数据，或载入你的 CSV 示例开始分析。',datasets.length>0&&!count)
}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function columns(){const rows=XLSX.utils.sheet_to_json(currentBook.book.Sheets[$('sheet').value],{header:1,defval:null}),h=Number($('headerrow').value)-1;if(!Number.isInteger(h)||h<0||h>=rows.length){$('maperror').textContent='表头行超出工作表范围';return}currentBook.rows=rows;$('maperror').textContent='';$('xcol').replaceChildren();$('ycols').replaceChildren();const headers=rows[h],known=$('sheet').value==='PVB Wedge Angles Data';headers.forEach((v,i)=>{if(v===null)return;const label=`${XLSX.utils.encode_col(i)} · ${String(v).slice(0,70)}`;for(const id of ['xcol','ycols']){const o=new Option(label,i);$(id).add(o)} });const x=[...$('xcol').options].find(o=>/Position|位置/i.test(o.text));if(x)$('xcol').value=x.value;[...$('ycols').options].forEach(o=>o.selected=/Thickness|厚度/i.test(o.text));$('offset').value=known?-1:0;$('maphint').textContent=known?'已识别你的对比页：位置偏移预设为 −1 mm，将1起点转换为CSV的0起点。只读取原始厚度列，不使用旧斜率公式。':'最终位置 = 表中位置 + 偏移。请确认位置和厚度单位均为 mm；旧表如将位置除以1000，请优先选择对比页。'}
function mapBook(book,name){return new Promise(resolve=>{currentBook={book,name,resolve};$('bookname').textContent=name;$('sheet').replaceChildren(...book.SheetNames.map(n=>new Option(n,n)));$('sheet').value=book.SheetNames.includes('PVB Wedge Angles Data')?'PVB Wedge Angles Data':book.SheetNames[0];$('headerrow').value=1;columns();$('mapping').showModal()})}
$('sheet').onchange=columns;$('headerrow').onchange=columns;$('mapping').addEventListener('close',()=>{if(currentBook){currentBook.resolve();currentBook=null}});$('cancelmap').onclick=()=>$('mapping').close();
$('addmap').onclick=()=>{try{const h=Number($('headerrow').value)-1,x=Number($('xcol').value),off=PVB.num($('offset').value),ys=[...$('ycols').selectedOptions].map(o=>Number(o.value));if(!Number.isInteger(h)||h<0||!Number.isFinite(off)||!ys.length||ys.includes(x))throw Error('请选择有效的表头、位置列、厚度列和偏移');const rows=currentBook.rows;if(h>=rows.length)throw Error('表头行超出范围');const added=[],skipped=[];for(const y of ys){const pairs=rows.slice(h+1).filter(r=>Number.isFinite(PVB.num(r[x]))).map(r=>[PVB.num(r[x])+off,r[y]]);if(!pairs.some(p=>Number.isFinite(PVB.num(p[1])))){skipped.push(rows[h][y]);continue}added.push([`${currentBook.name} / ${rows[h][y]}`,PVB.normalize(pairs)])}if(!added.length)throw Error('所选列没有可读取的数值厚度');added.forEach(([n,d])=>add(n,d));$('mapping').close();render();if(skipped.length)say('已导入有效厚度列；跳过空列：'+skipped.join('、'))}catch(e){$('maperror').textContent=e.message}};
async function importFiles(files){for(const file of files){try{if(/\.csv$/i.test(file.name)){const bytes=new Uint8Array(await file.arrayBuffer());let template=null;try{template=PVB.csvTemplate(bytes)}catch{}add(file.name,PVB.csv(new TextDecoder().decode(bytes)),template);render()}else if(/\.xlsx?$/i.test(file.name)){await mapBook(XLSX.read(await file.arrayBuffer(),{type:'array'}),file.name)}else throw Error('仅支持 CSV、XLSX、XLS 文件')}catch(e){say(file.name+'：'+e.message,true)}}}
$('files').onchange=e=>{const files=[...e.target.files];importQueue=importQueue.then(()=>importFiles(files));e.target.value=''};$('drop').ondragover=e=>e.preventDefault();$('drop').ondrop=e=>{e.preventDefault();const files=[...e.dataTransfer.files];importQueue=importQueue.then(()=>importFiles(files))};
$('sample').onclick=()=>{if(datasets.some(d=>d.name==='data202609031152763.csv')){say('示例已载入');return}add('data202609031152763.csv',PVB.csv(window.PVB_SAMPLE));render()};$('clear').onclick=()=>{datasets=[];updateList();render()};['window','smooth'].forEach(id=>$(id).onchange=render);['slope','thickness'].forEach(id=>$(id).onclick=()=>{mode=id;render()});
$('range').onclick=()=>{const l=PVB.num($('xmin').value),h=PVB.num($('xmax').value);if(!Number.isFinite(l)||!Number.isFinite(h)||l>=h){say('显示起点必须小于终点',true);return}viewRange=[l,h];render()};$('yrange').onclick=()=>{const l=PVB.num($('ymin').value),h=PVB.num($('ymax').value);if(!Number.isFinite(l)||!Number.isFinite(h)||l>=h){say('纵坐标最小值必须小于最大值',true);return}yRange=[l,h];render();Plotly.relayout('chart',{'yaxis.range':yRange,'yaxis.autorange':false})};$('reset').onclick=()=>{viewRange=[250,800];yRange=[0,1];$('ymin').value='0';$('ymax').value='1';$('xmin').value='250';$('xmax').value='800';render();Plotly.relayout('chart',{'xaxis.range':[250,800],'xaxis.autorange':false,'yaxis.range':[0,1],'yaxis.autorange':false})};$('png').onclick=()=>{try{settings()}catch(e){say(e.message,true);return}if(!datasets.length){say('请先导入数据',true);return}Plotly.downloadImage('chart',{format:'png',filename:'PVB_'+mode,width:1500,height:Math.max(800,$('chart').clientHeight),scale:2})};
$('export').onclick=()=>{try{if(!datasets.length)throw Error('请先导入数据');const st=settings(),lines=['样本,位置_mm,数值,单位,窗口_mm,平滑点数'];const quote=s=>'"'+String(s).replace(/"/g,'""')+'"';datasets.forEach(d=>{const f=PVB.evaluator(d.data,st.H,st.n,mode);d.data.forEach(([x])=>{const y=f(x);lines.push([quote(/^[=+@-]/.test(d.name)?"'"+d.name:d.name),x,Number.isFinite(y)?y:'',mode==='slope'?'mrad':'mm',st.H,st.n].join(','))})});download(new Blob(['\uFEFF'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}),'PVB_'+mode+'.csv')}catch(e){say(e.message,true)}};
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'read_pvb_settings',description:'读取本地PVB曲线的当前计算设置和眼盒边界',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({...settings(),mode,samples:datasets.map(d=>({name:d.name,points:d.data.length}))})})).catch(()=>{})}catch{}}
render();

$('chart').on('plotly_legendclick',e=>{const d=datasets.find(d=>String(d.id)===e.data[e.curveNumber].legendgroup);if(d){d.visible=!d.visible;updateList();render()}return false});
$('chart').on('plotly_legenddoubleclick',()=>false);
// Keep dragged label positions when settings or visibility cause a redraw.
$('chart').on('plotly_relayout',changes=>{
 if(!Object.keys(changes).some(key=>/^annotations\[\d+\]\.(ax|ay)$/.test(key)))return;
 $('chart').layout.annotations.forEach(label=>{
  if(!label.name?.startsWith('average-'))return;
  const d=datasets.find(d=>label.name==='average-'+d.id);
  if(d){d.labelPositions??={};d.labelPositions[mode]={ax:label.ax,ay:label.ay}}
 });
});

// Combining samples is independent of their chart visibility.
function averageSelection(){return [...$('average-options').querySelectorAll('input:checked')].map(e=>datasets.find(d=>d.id===Number(e.value))).filter(Boolean)}
function averageLabel(){const names=[...new Set(averageSelection().map(d=>d.name.replace(/^(?:AVE_)+/i,'').replace(/\.csv$/i,'').replace(/(data\d{8})\d+(?=_|$)/gi,'$1')))].join('、');return names?averageName(names):''}
let suggestedAverageName='';
function averageCount(){const input=$('average-name');if(!input.value.trim()||input.value===suggestedAverageName)input.value=averageLabel();suggestedAverageName=averageLabel();$('average-count').textContent=`已选择 ${averageSelection().length} 个样本（至少 2 个）`;$('average-error').textContent=''}
$('average-open').onclick=()=>{
 $('average-options').replaceChildren();
 datasets.forEach(d=>{const label=document.createElement('label'),input=document.createElement('input'),text=document.createElement('span');label.className='average-check';input.type='checkbox';input.value=d.id;input.checked=!d.aggregate;input.onchange=averageCount;text.textContent=d.name+(d.aggregate?'（已合成）':'');label.append(input,text);$('average-options').append(label)});
 $('average-name').value='';averageCount();$('average-dialog').showModal();
};
$('average-all').onclick=()=>{$('average-options').querySelectorAll('input').forEach(e=>e.checked=true);averageCount()};
$('average-none').onclick=()=>{$('average-options').querySelectorAll('input').forEach(e=>e.checked=false);averageCount()};
$('average-cancel').onclick=()=>$('average-dialog').close();
$('average-create').onclick=()=>{try{
 settings();const selected=averageSelection(),data=PVB.average(selected.map(d=>d.data));
 const name=averageName($('average-name').value.trim()||`平均曲线 ${nextId}（${selected.length} 个样本）`);
 if($('average-only').checked)datasets.forEach(d=>d.visible=false);
 const combined={id:nextId++,name,data,visible:true,color:nextCurveColor(),aggregate:true,sources:selected.map(d=>d.name)};
 datasets.push(combined);updateList();$('average-dialog').close();render();
 say(`已生成「${name}」：${selected.length} 个样本的平均厚度，范围 ${data[0][0]}–${data[data.length-1][0]} mm；楔角沿用当前窗口和平滑设置。`);
}catch(e){$('average-error').textContent=e.message}};
