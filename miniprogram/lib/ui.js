const store=require('./store');
const core=require('./core');
function toast(title){wx.showToast({title,icon:'none'});}
function run(fn){try{const r=fn();if(r&&r.catch)return r.catch(e=>toast(e.message||'操作失败，请重试'));return r;}catch(e){toast(e.message||'保存失败，请重试');}}
function navigate(page,params={}){const query=Object.keys(params).map(k=>k+'='+encodeURIComponent(params[k])).join('&');wx.navigateTo({url:'/pages/'+page+'/index'+(query?'?'+query:'')});}
function profile(){navigate('profile');}
function requireProfile(){if(!store.read().profile){toast('请先建立个人档案');profile();return false;}return true;}
function dayView(state,date){const plan=state.plans[date];if(!plan)return null;const s=state.sessions[date];const meals=plan.meals.map(m=>Object.assign({},m,{nutrition:core.nutrition(m.items),recorded:!!state.meals[date+'|'+m.id],names:m.items.map(i=>i.name).join(' · ')}));const actual=core.nutrition(meals.reduce((arr,m)=>arr.concat(state.meals[date+'|'+m.id]?state.meals[date+'|'+m.id].items:[]),[]));return Object.assign({},plan,{meals,status:!plan.training?'休息日':s?s.status:'未开始',nutrition:core.nutrition(plan.meals.reduce((a,m)=>a.concat(m.items),[])),actual,recorded:meals.filter(m=>m.recorded).length});}
module.exports={toast,run,navigate,profile,requireProfile,dayView};
