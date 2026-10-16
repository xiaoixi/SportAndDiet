const crypto=require('crypto');
const validate=require('./validate');
function dataOf(result){return result&&Array.isArray(result.data)?result.data[0]:result&&result.data;}
async function get(ref){try{return dataOf(await ref.get())||null;}catch(e){if(e.code==='DOCUMENT_NOT_FOUND'||/document.*(?:not exist|not found)|文档不存在/i.test(e.errMsg||e.message||''))return null;throw e;}}
async function atomic(db,fn){
  const tx=await db.startTransaction();
  try{const result=await fn(tx);await tx.commit();return result;}catch(e){try{await tx.rollback();}catch(_){}throw e;}
}
function createService({db,openid,appid,admins=[]}){
  return async function(event){
    if(!openid||!appid)validate.fail('请从已关联的微信小程序调用');
    const accountId=crypto.createHash('sha256').update(appid+':'+openid).digest('hex');
    const action=event.action;
    if(action==='load'){const doc=await get(db.collection('journals').doc(accountId));return {state:doc?doc.state:null,rev:doc?doc.rev:0};}
    if(action==='save'||action==='delete'){
      if(!Number.isInteger(event.rev)||event.rev<0)validate.fail('数据版本不正确');
      if(action==='save'){validate.state(event.state);if(!/^[a-zA-Z0-9-]{1,100}$/.test(event.operationId||''))validate.fail('缺少有效的提交标识');}
      return atomic(db,async tx=>{
        const ref=tx.collection('journals').doc(accountId),doc=await get(ref),rev=doc?doc.rev:0;
        if(action==='save'&&doc&&doc.operationId===event.operationId)return {rev};
        if(rev!==event.rev){if(action==='delete')validate.fail('云端记录已变更，请先解决同步冲突再注销');return {conflict:true,rev};}
        if(action==='delete'){if(doc)await ref.remove();return {deleted:true};}
        await ref.set({data:{state:event.state,rev:rev+1,operationId:event.operationId,updatedAt:Date.now()}});return {rev:rev+1};
      });
    }
    if(action==='catalog'){
      const pointer=await get(db.collection('content').doc('active'));
      if(!pointer)return {catalog:null};
      const version=await get(db.collection('content').doc('v-'+pointer.version));
      return {catalog:version&&version.status==='published'?Object.assign({},version.catalog,{version:version.version,status:'published'}):null};
    }
    if(!action||!action.startsWith('admin'))validate.fail('不支持的操作');
    if(!admins.includes(openid))validate.fail('当前账户没有内容管理权限');
    if(action==='adminList'){
      const result=await db.collection('content').where({kind:'version'}).orderBy('updatedAt','desc').limit(50).get();
      return {versions:result.data.map(v=>({version:v.version,status:v.status,updatedAt:v.updatedAt}))};
    }
    if(!/^[a-zA-Z0-9-]{1,60}$/.test(event.version||''))validate.fail('版本号只能包含字母、数字和横线');
    const id='v-'+event.version;
    if(action==='adminGet'){const doc=await get(db.collection('content').doc(id));if(!doc)validate.fail('版本不存在');return {catalog:doc.catalog,version:doc.version,status:doc.status};}
    if(action==='adminSave'){
      validate.catalog(event.catalog);
      return atomic(db,async tx=>{
        const ref=tx.collection('content').doc(id),old=await get(ref);
        if(old&&old.status!=='draft')validate.fail('已审核内容不能直接修改，请新建版本');
        const now=Date.now();
        await ref.set({data:{kind:'version',version:event.version,status:'draft',catalog:event.catalog,updatedAt:now}});
        await tx.collection('content_audit').doc(crypto.randomUUID()).set({data:{actor:accountId,version:event.version,action:'save-draft',at:now}});
        return {saved:true};
      });
    }
    if(action==='adminTransition')return atomic(db,async tx=>{
      const ref=tx.collection('content').doc(id),old=await get(ref);
      if(!old)validate.fail('版本不存在');
      const permitted={draft:'reviewed',reviewed:'published',published:'disabled'};
      if(permitted[old.status]!==event.status)validate.fail('内容状态流转不合法');
      validate.catalog(old.catalog);
      const pointerRef=tx.collection('content').doc('active'),pointer=await get(pointerRef);
      if(event.status==='published')await pointerRef.set({data:{version:event.version}});
      if(event.status==='disabled'&&pointer&&pointer.version===event.version)await pointerRef.remove();
      await ref.update({data:{status:event.status,updatedAt:Date.now()}});
      await tx.collection('content_audit').doc(crypto.randomUUID()).set({data:{actor:accountId,version:event.version,action:event.status,at:Date.now()}});
      return {updated:true};
    });
    validate.fail('不支持的管理操作');
  };
}
module.exports={createService};
