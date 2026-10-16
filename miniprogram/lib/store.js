const core=require('./core');
const config=require('../config');
const KEY='lianshi.v1';
let busy=false;
function envelope(){const value=wx.getStorageSync(KEY);return value&&value.state?value:{state:core.empty(),rev:0,dirty:false,connected:false,generation:0};}
function persist(e){wx.setStorageSync(KEY,e);}
function read(){return core.clone(envelope().state);}
function write(state){const e=envelope();e.state=state;e.dirty=true;e.generation=(e.generation||0)+1;e.operationId=Date.now()+'-'+Math.random().toString(36).slice(2);persist(e);sync().catch(()=>{});return state;}
function update(fn){return write(fn(read()));}
function touch(){const state=read();const next=core.ensurePlans(state);if(JSON.stringify(state)!==JSON.stringify(next))write(next);return next;}
async function call(action,data={}){if(!config.cloudEnv)throw Error('请先在 config.js 配置云环境并部署云函数');const res=await wx.cloud.callFunction({name:config.functionName,data:Object.assign({action},data)});if(!res.result||res.result.error)throw Error(res.result&&res.result.error||'云端未返回结果');return res.result;}
async function connect(){
  if(busy)throw Error('正在同步，请稍后');
  const result=await call('load'), e=envelope();
  if(result.state){
    const answer=await wx.showModal({title:'使用云端档案？',content:'云端已有记录。确认后将以云端记录替换此设备数据；取消则继续保留本地数据。',confirmText:'使用云端'});
    if(!answer.confirm)return;
    e.state=result.state;e.dirty=false;
  }
  e.rev=result.rev;e.connected=true;e.conflict=false;e.dirty=result.state?false:true;e.generation++;e.operationId=Date.now()+'-'+Math.random().toString(36).slice(2);persist(e);await sync();
}
async function sync(){
  const e=envelope();if(busy||!e.connected||e.conflict)return;
  busy=true;
  try{
    if(!e.dirty){
      const remote=await call('load'),current=envelope();
      if(current.connected&&remote.rev!==e.rev){
        if(current.generation!==e.generation)current.conflict=true;
        else {current.state=remote.state||core.empty();current.rev=remote.rev;current.generation++;if(!remote.state)current.connected=false;}
        persist(current);
      }
    }else{
    const result=await call('save',{state:e.state,rev:e.rev,operationId:e.operationId});
    const current=envelope();if(!current.connected)return;
    if(result.conflict){current.conflict=true;persist(current);return;}
    current.rev=result.rev;current.dirty=current.generation!==e.generation;current.lastSync=Date.now();persist(current);
    }
  }finally{busy=false;}
  if(envelope().dirty&&!envelope().conflict) return sync();
}
async function resolve(useCloud){
  if(busy)throw Error('正在同步，请稍后');
  busy=true;
  try{
    const result=await call('load'),e=envelope();
    if(useCloud){e.state=result.state||core.empty();e.dirty=false;}else e.dirty=true;
    e.rev=result.rev;e.conflict=false;e.generation++;e.operationId=Date.now()+'-'+Math.random().toString(36).slice(2);persist(e);
  }finally{busy=false;}
  await sync();
}
async function removeAccount(){if(busy)throw Error('正在同步，请稍后重试');const e=envelope();if(e.connected)await call('delete',{rev:e.rev});wx.removeStorageSync(KEY);}
function status(){const e=envelope();return {connected:e.connected,dirty:e.dirty,conflict:!!e.conflict,label:e.conflict?'有同步冲突，请选择保留版本':e.connected?(e.dirty?'已保存在本机，待同步':'云端已同步'):'本地模式 · 仅保存在此设备'};}
module.exports={read,write,update,touch,call,connect,sync,resolve,removeAccount,status};
