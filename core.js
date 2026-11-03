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
const api={num,normalize,csv,at,smooth,evaluator,average};root.PVB=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
