const cloud=require('wx-server-sdk');
const {createService}=require('./service');
cloud.init({env:cloud.DYNAMIC_CURRENT_ENV});
exports.main=async event=>{
  const {OPENID,APPID}=cloud.getWXContext();
  const service=createService({db:cloud.database(),openid:OPENID,appid:APPID,admins:(process.env.ADMIN_OPENIDS||'').split(',').map(s=>s.trim()).filter(Boolean)});
  try{return await service(event||{});}catch(e){
    // 不在日志中记录用户档案或原始请求。
    if(e.public)return {error:e.message};
    console.error('journal failure',e.code||'UNEXPECTED');
    return {error:'云端操作失败，请检查环境配置或稍后重试'};
  }
};
