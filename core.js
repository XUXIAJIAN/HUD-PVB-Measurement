(function(root){
function num(v){return v===null||v===undefined||String(v).trim()===''?NaN:Number(v)}
function normalize(rows){const data=rows.map(([x,y])=>[num(x),num(y)]).filter(p=>Number.isFinite(p[0])).sort((a,b)=>a[0]-b[0]);if(data.filter(p=>Number.isFinite(p[1])).length<2)throw Error('至少需要两个有效的厚度数据点');for(let i=1;i<data.length;i++)if(data[i][0]===data[i-1][0])throw Error('位置重复：'+data[i][0]+' mm，请先核对数据');return data}
function csv(text){const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/);const start=lines.findIndex(x=>x.trim()==='[Data]');const rows=lines.slice(start>=0?start+1:0).filter(x=>x.trim()).map(x=>x.split(/[,;\t]/).map(v=>v.trim().replace(/^"|"$/g,''))).filter(r=>Number.isFinite(num(r[0])));return normalize(rows)}
function at(data,x){if(!data.length||x<data[0][0]||x>data[data.length-1][0])return NaN;let l=0,r=data.length-1;while(l<r){const m=(l+r)>>1;if(data[m][0]<x)l=m+1;else r=m}if(data[l][0]===x)return data[l][1];if(!l)return NaN;const a=data[l-1],b=data[l];return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0])}
function smooth(data,n){if(n===1)return data;const h=(n-1)/2;return data.map(([x],i)=>{if(i<h||i+h>=data.length)return[x,NaN];let sum=0;for(let j=i-h;j<=i+h;j++)sum+=data[j][1];return[x,sum/n]})}
function evaluator(data,H,n,mode){if(!Number.isFinite(H)||H<=0)throw Error('斜率窗口必须大于0');if(!Number.isInteger(n)||n<1||n%2!==1)throw Error('平滑点数必须为正奇数');const d=smooth(data,n);return x=>mode==='thickness'?at(d,x):(at(d,x+H/2)-at(d,x-H/2))/H*1000}
// Keep every source knot so linear interpolation of the mean stays exact.
function average(series){
 if(series.length<2)throw Error('请至少选择两个样本');
 const inputs=series.map(normalize);
 const lo=Math.max(...inputs.map(d=>d[0][0])),hi=Math.min(...inputs.map(d=>d[d.length-1][0]));
 if(lo>=hi)throw Error('所选样本没有足够的共同位置范围');
 const positions=new Set([lo,hi]);
 inputs.forEach(d=>d.forEach(([x])=>{if(x>=lo&&x<=hi)positions.add(x)}));
 const rows=[...positions].sort((a,b)=>a-b).map(x=>{
  const values=inputs.map(d=>at(d,x));
  return[x,values.every(Number.isFinite)?values.reduce((sum,v)=>sum+v/values.length,0):NaN];
 });
 return normalize(rows);
}
// Integral of a local slope increment; thickness stays continuous at both ends.
function adjustWedge(data,start,end,value,kind,H=60,n=1){
 if(![start,end,value].every(Number.isFinite)||start>=end)throw Error('请输入有效区间和楔角，起点必须小于终点');
 if(start<data[0][0]||end>data[data.length-1][0])throw Error('调整区间必须在样本位置范围内');
 const ramp=x=>Math.max(0,Math.min(x-start,end-start))/1000;
 const baseline=evaluator(data,H,n,'slope');
 const unit=evaluator(data.map(([x,y])=>[x,Number.isFinite(y)?ramp(x):NaN]),H,n,'slope');
 const xs=data.map(p=>p[0]).filter(x=>x>=start&&x<=end&&Number.isFinite(baseline(x))&&Number.isFinite(unit(x)));
 if(!xs.length)throw Error('区间内无有效楔角，请扩大区间或减小计算窗口');
 const mean=xs.reduce((a,x)=>a+baseline(x),0)/xs.length;
 const gain=xs.reduce((a,x)=>a+unit(x),0)/xs.length;
 if(gain<=0)throw Error('该区间无法调整');
 const delta=kind==='target'?(value-mean)/gain:value;
 const result=data.map(([x,y])=>[x,Number.isFinite(y)?y+delta*ramp(x):NaN]);
 if(result.some(([,y])=>Number.isFinite(y)&&y<=0))throw Error('调整后出现非正厚度，请减小调整幅度');
 const f=evaluator(result,H,n,'slope');
 return {data:result,delta,before:mean,after:xs.reduce((a,x)=>a+f(x),0)/xs.length,offset:delta*(end-start)/1000};
}
function applyAdjustments(original,records){
 const result=original.map(([x,y])=>[x,Number.isFinite(y)?y+records.filter(r=>r.active).reduce((sum,r)=>sum+r.delta*Math.max(0,Math.min(x-r.start,r.end-r.start))/1000,0):NaN]);
 if(result.some(([,y])=>Number.isFinite(y)&&y<=0))throw Error('此操作会产生非正厚度，请先撤销其他相关调整');
 return result;
}
// Work on binary strings to preserve header encoding and original line endings.
function csvTemplate(bytes){
 const text=Array.from(bytes,b=>String.fromCharCode(b)).join('');
 const marker=/^\[Data\][ \t]*\r?$/m.exec(text);let offset=marker?marker.index+marker[0].length:0;
 const rows=[];const pattern=/[^\r\n]+/g;pattern.lastIndex=offset;let m;
 while((m=pattern.exec(text))){
  const match=/^(\s*"?[-+]?\d+(?:\.\d+)?"?\s*[,;\t])(\s*)("?)([-+]?(?:\d+(?:\.\d*)?|\.\d+))("?)([^\r\n]*)$/.exec(m[0]);
  if(!match)continue;
  const x=Number(match[1].slice(0,-1).trim().replace(/"/g,'')),y=Number(match[4]);
  if(!Number.isFinite(x)||!Number.isFinite(y))continue;
  rows.push({x,y,start:m.index+match[1].length+match[2].length+match[3].length,length:match[4].length,precision:(match[4].split('.')[1]||'').length});
 }
 if(rows.length<2)throw Error('无法保留此 CSV 的原始格式；请使用两列数值或 [Data] 格式');
 normalize(rows.map(r=>[r.x,r.y]));return {text,rows};
}
function exportTemplate(template,data){
 const values=new Map(data);let text=template.text;
 for(const row of [...template.rows].reverse()){
  const y=values.get(row.x);if(!Number.isFinite(y))throw Error('导出数据与原始位置不匹配');
  if(y===row.y)continue;
  text=text.slice(0,row.start)+y.toFixed(row.precision)+text.slice(row.start+row.length);
 }
 return Uint8Array.from(text,c=>c.charCodeAt(0));
}
const api={num,normalize,csv,at,smooth,evaluator,average,adjustWedge,applyAdjustments,csvTemplate,exportTemplate};root.PVB=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
