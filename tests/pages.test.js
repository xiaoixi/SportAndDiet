const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('path');
const core=require('../miniprogram/lib/core');
let storage={},toasts=[],nextModal={confirm:true,content:'10'};
global.wx={getStorageSync:key=>storage[key]?core.clone(storage[key]):undefined,setStorageSync:(key,v)=>{storage[key]=core.clone(v);},removeStorageSync:key=>{delete storage[key];},showToast:({title})=>toasts.push(title),showModal:async()=>nextModal,showActionSheet:async()=>({tapIndex:0}),navigateTo(){},switchTab(){}};
const store=require('../miniprogram/lib/store');
function page(name){let instance;global.Page=definition=>{instance=definition;};const file=path.resolve(__dirname,'../miniprogram/pages/'+name+'/index.js');delete require.cache[file];require(file);delete global.Page;instance.data=core.clone(instance.data||{});instance.setData=function(values){for(const [key,value] of Object.entries(values)){const parts=key.split('.');let target=this.data;while(parts.length>1){const part=parts.shift();target=target[part]||(target[part]={});}target[parts[0]]=value;}};return instance;}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function event(dataset={},value){return {currentTarget:{dataset},detail:{value}};}
const profile={age:28,height:170,weight:65,goal:'养成习惯',minutes:25,days:[1,3,5],allergies:[],avoid:'',vegan:false,experience:'新手',place:'居家',equipment:'无器械'};
test('页面流程：示例→建档→训练→餐次修改→历史→删除',async()=>{
  storage={};const today=page('today');today.onShow();assert.equal(today.data.demo,true);assert.equal(today.data.day.meals.length,3);
  const p=page('profile');p.onLoad();p.setData({form:profile,consent:true});p.save();await tick();assert.equal(store.read().profile.age,28);
  today.onShow();assert.equal(today.data.demo,false);
  const plan=page('plan');plan.onShow();assert.equal(plan.data.days.length,7);
  const state=store.read(),date=Object.keys(state.plans).find(d=>state.plans[d].training);const workout=page('workout');workout.onLoad({date});workout.refresh();workout.setData({future:false});workout.start();assert.equal(store.read().sessions[date].status,'进行中');await workout.log(event({index:0}));assert.equal(store.read().sessions[date].exercises[0].logs.length,1);
  workout.toggle();assert.equal(workout.data.session.runningSince,null);const reopened=page('workout');reopened.onLoad({date});reopened.refresh();assert.equal(reopened.data.done,1);reopened.end();await tick();assert.equal(store.read().sessions[date].status,'部分完成');
  const meal=page('meal'),todayDate=core.dateKey();meal.onLoad({date:todayDate,id:'breakfast'});meal.planned();assert.equal(Object.keys(store.read().meals).length,1);meal.grams(event({index:0},'200'));meal.save();assert.equal(store.read().meals[todayDate+'|breakfast'].items[0].grams,200);meal.save();assert.equal(Object.keys(store.read().meals).length,1);meal.clear();await tick();assert.equal(Object.keys(store.read().meals).length,0);
  const records=page('records');records.onShow();records.setData({weightValue:'64.5',weightDate:todayDate});records.saveWeight();assert.equal(records.data.weights.length,1);assert.equal(store.read().weights[todayDate].value,64.5);records.select(event({date:''}));assert.ok(records.data.selected);
  const me=page('me');me.onShow();assert.ok(me.data.profile);me.clear();await tick();assert.equal(Object.keys(store.read().sessions).length,0);assert.ok(store.read().profile);me.remove();await tick();assert.equal(store.read().profile,null);
});
test('份量非法不覆盖原始饮食，存储失败显示失败反馈',()=>{
  storage={};store.write(core.regenerate(core.empty(),profile));const date=core.dateKey(),meal=page('meal');meal.onLoad({date,id:'lunch'});meal.planned();const before=core.clone(store.read().meals);meal.grams(event({index:0},'-10'));meal.save();assert.deepEqual(store.read().meals,before);const original=wx.setStorageSync;wx.setStorageSync=()=>{throw Error('存储空间不足');};const records=page('records');records.setData({weightDate:date,weightValue:'65'});records.saveWeight();assert.equal(toasts.at(-1),'存储空间不足');wx.setStorageSync=original;
});
test('未授权管理入口不会获得管理能力',async()=>{const admin=page('admin');admin.onLoad();await tick();assert.equal(admin.data.authorized,false);assert.match(toasts.at(-1),/云环境/);});
