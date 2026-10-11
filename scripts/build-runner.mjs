import { writeFileSync } from "node:fs";
// Trusted harness closure holds the transferred result port. Submitted Function code
// runs in global scope and cannot reach it. Ordinary worker messages are ignored.
const worker = `"use strict";
(() => {
 const encode=JSON.stringify.bind(JSON), decode=JSON.parse.bind(JSON), now=performance.now.bind(performance), finite=Number.isFinite.bind(Number);
 const slice=Function.call.bind(String.prototype.slice), push=Function.call.bind(Array.prototype.push), keys=Object.keys.bind(Object), isArray=Array.isArray.bind(Array), getPrototype=Object.getPrototypeOf.bind(Object), proto=Object.prototype, create=Object.create.bind(Object);
 for(const value of [Object,Object.prototype,Array,Array.prototype,String,String.prototype,Number,Number.prototype,Boolean,Boolean.prototype,Function,Function.prototype,Promise,Promise.prototype,Map,Map.prototype,Set,Set.prototype,JSON,Math]) Object.freeze(value);
 function canonical(value) {
  let nodes=0;
  function visit(v,depth){if(++nodes>10000||depth>50)throw Error('Result exceeds structural limits.');if(v===null||typeof v==='string'||typeof v==='boolean')return v;if(typeof v==='number'&&finite(v))return v;
   if(isArray(v)){const result=[];for(let i=0;i<v.length;i++)push(result,visit(v[i],depth+1));return result;}
   if(typeof v==='object'&&(getPrototype(v)===proto||getPrototype(v)===null)){const result=create(null),names=keys(v).sort();for(let i=0;i<names.length;i++)result[names[i]]=visit(v[names[i]],depth+1);return result;}
   throw Error('Return a finite JSON-compatible value, not undefined, a function or a custom object.');
  }
  return encode(visit(value,0));
 }
 onmessage=async event=>{
  onmessage=null;
  const {source,cases,port}=event.data;
  const send=port.postMessage.bind(port), logs=[];
  const output=(...args)=>{if(logs.length<50){try{push(logs,slice(args.map(x=>typeof x==='string'?x:encode(x)).join(' '),0,1000));}catch{push(logs,'[unserializable output]');}}};
  console.log=output;console.warn=output;console.error=output;
  const start=now(); const results=[];
  try {
   const moduleURL=URL.createObjectURL(new Blob([source+'\\n;export { solve };'],{type:'text/javascript'}));
   const {solve}=await import(moduleURL);
   if(typeof solve!=='function')throw Error('Define function solve(input).');
   for(let i=0;i<cases.length;i++){
    const c=cases[i], expected=canonical(c.expected),args=decode(encode(c.args)), before=canonical(args);
    try {const value=await solve(...args);const actual=canonical(value);push(results,{label:c.label,passed:actual===expected&&(!c.unchanged||canonical(args)===before),actual:slice(actual,0,2000)});}
    catch(error){push(results,{label:c.label,passed:false,actual:slice(String(error),0,2000)});}
   }
   send({results,logs,elapsed:Math.max(0,now()-start)});
  } catch(error){send({results:[],logs,elapsed:Math.max(0,now()-start),error:slice(String(error),0,2000)});}
 };
})();`;
const coordinator = `(() => {
const harness=${JSON.stringify(worker)};
let used=false;
addEventListener('message', event=>{
 if(used||event.source!==parent) return;
 const m=event.data;
 if(!m||m.type!=='ascend-run'||typeof m.id!=='string'||typeof m.source!=='string'||m.source.length>30000||!Array.isArray(m.cases)||m.cases.length>50) return;
 used=true;
 const worker=new Worker(URL.createObjectURL(new Blob([harness],{type:'text/javascript'})));
 const channel=new MessageChannel(); let finished=false;
 const finish=result=>{if(finished)return;finished=true;worker.terminate();channel.port1.close();parent.postMessage({type:'ascend-result',id:m.id,...result},'*');};
 const timeout=setTimeout(()=>finish({error:'Execution stopped: 3 second time limit.',results:[],logs:[],elapsed:3000}),3000);
 channel.port1.onmessage=e=>{clearTimeout(timeout);finish(e.data);};
 worker.onerror=()=>{clearTimeout(timeout);finish({error:'Sandbox execution failed.',results:[],logs:[],elapsed:0});};
 worker.postMessage({source:m.source,cases:m.cases,port:channel.port2},[channel.port2]);
});
parent.postMessage({type:'ascend-runner-ready'},'*');
})();`;
writeFileSync(
  "public/runner.html",
  `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' blob:; worker-src blob:; connect-src 'none'; img-src 'none'; style-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><title>ASCEND isolated JavaScript runner</title></head><body><script>${coordinator.replaceAll("</script", "<\\/script")}</script></body></html>`,
);
