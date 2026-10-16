const {test}=require('node:test'),assert=require('node:assert/strict'),core=require('../miniprogram/lib/core');
const config=require('../miniprogram/config');config.cloudEnv='test';
let memory={},remote=null,rev=0,offline=false,lastOperation=null;
global.wx={getStorageSync:k=>memory[k]?core.clone(memory[k]):undefined,setStorageSync:(k,v)=>{memory[k]=core.clone(v);},removeStorageSync:k=>delete memory[k],showModal:async()=>({confirm:true}),cloud:{callFunction:async({data})=>{if(offline)throw Error('offline');if(data.action==='load')return {result:{state:remote?core.clone(remote):null,rev}};if(data.action==='save'){if(lastOperation===data.operationId)return {result:{rev}};if(data.rev!==rev)return {result:{conflict:true,rev}};remote=core.clone(data.state);rev++;lastOperation=data.operationId;return {result:{rev}};}if(data.action==='delete'){remote=null;rev=0;return {result:{deleted:true}};}}}};
const store=require('../miniprogram/lib/store');const tick=()=>new Promise(r=>setImmediate(r));
test('离线写入保留，同步恢复，冲突不自动覆盖，注销清除',async()=>{
  await store.connect();assert.equal(store.status().connected,true);assert.equal(rev,1);
  offline=true;store.update(s=>{s.weights['2026-10-16']={value:65};return s;});await tick();assert.equal(store.status().dirty,true);assert.equal(store.read().weights['2026-10-16'].value,65);assert.equal(remote.weights['2026-10-16'],undefined);
  offline=false;await store.sync();assert.equal(remote.weights['2026-10-16'].value,65);assert.equal(store.status().dirty,false);
  remote.weights['2026-10-16']={value:66};rev++;store.update(s=>{s.weights['2026-10-16']={value:64};return s;});await tick();assert.equal(store.status().conflict,true);assert.equal(remote.weights['2026-10-16'].value,66);await store.resolve(true);assert.equal(store.read().weights['2026-10-16'].value,66);assert.equal(store.status().conflict,false);
  remote.weights['2026-10-16']={value:67};rev++;await store.sync();assert.equal(store.read().weights['2026-10-16'].value,67);
  await store.removeAccount();assert.equal(remote,null);assert.equal(store.status().connected,false);assert.equal(store.read().profile,null);
});
