const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('path');
const core=require('../miniprogram/lib/core');
let storage={},toasts=[],nextModal={confirm:true,content:'10'};
global.wx={getStorageSync:key=>storage[key]?core.clone(storage[key]):undefined,setStorageSync:(key,v)=>{storage[key]=core.clone(v);},removeStorageSync:key=>{delete storage[key];},showToast:({title})=>toasts.push(title),showModal:async()=>nextModal,showActionSheet:async()=>({tapIndex:0}),navigateTo(){},switchTab(){}};
const store=require('../miniprogram/lib/store');
function page(name){let instance;global.Page=definition=>{instance=definition;};const file=path.resolve(__dirname,'../miniprogram/pages/'+name+'/index.js');delete require.cache[file];require(file);delete global.Page;instance.options={};instance.data=core.clone(instance.data||{});instance.setData=function(values){for(const [key,value] of Object.entries(values)){const parts=key.split('.');let target=this.data;while(parts.length>1){const part=parts.shift();target=target[part]||(target[part]={});}target[parts[0]]=value;}};return instance;}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function event(dataset={},value){return {currentTarget:{dataset},detail:{value}};}
const profile={age:28,height:170,weight:65,goal:'养成习惯',minutes:25,days:[1,3,5],allergies:[],avoid:'',vegan:false,experience:'新手',place:'居家',equipment:'无器械'};
test('日期在今日页内切换，非今天体重在两个入口均不可修改保存',()=>{
  storage={};const date=core.dateKey(),monday=core.addDays(date,-((core.weekday(date)+6)%7));
  const other=core.addDays(monday,date===monday?1:0),state=core.regenerate(core.empty(),profile,monday);
  state.weights[other]={value:63};state.weights[date]={value:65};store.write(state);
  const today=page('today');today.onShow();today.inputWeight(event({},'64.5'));
  const original=wx.switchTab;let jumps=0;wx.switchTab=()=>jumps++;
  try{today.selectDate(event({date:other}));}finally{wx.switchTab=original;}
  assert.equal(jumps,0);assert.equal(today.data.date,other);assert.equal(today.data.day.date,other);
  assert.equal(today.data.weightInput,'63');assert.equal(today.data.isToday,false);
  const before=core.clone(store.read().weights);today.inputWeight(event({},'70'));today.saveWeight();
  assert.equal(today.data.weightInput,'63');assert.deepEqual(store.read().weights,before);assert.deepEqual(today.data.weightEffects,[]);
  today.selectDate(event({date}));assert.equal(today.data.weightInput,'64.5');assert.equal(today.data.isToday,true);
  const records=page('records');records.onShow();records.date(event({},other));records.input(event({},'72'));records.saveWeight();
  assert.equal(records.data.weightValue,'63');assert.deepEqual(store.read().weights,before);
  // 保存时重新验证实际日期，覆盖跨午夜及直接调用处理函数的情况。
  today.setData({date:core.addDays(date,-1),weightInput:'72'});today.saveWeight();assert.deepEqual(store.read().weights,before);
});
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
test('微信注入页面 options 参数后，建档选项仍能加载与切换',()=>{
  storage={};
  const profilePage=page('profile');
  profilePage.options={source:'regression-test'};
  profilePage.onLoad();
  assert.equal(profilePage.data.days.length,7);
  assert.equal(profilePage.data.allergies.length,8);
  profilePage.day(event({id:1}));
  assert.equal(profilePage.data.days.find(day=>day.id===1).active,false);
  profilePage.allergy(event({name:'大豆'}));
  assert.equal(profilePage.data.allergies.find(item=>item.name==='大豆').active,true);
});
test('减脂和增肌保存目标体重，其他目标不携带隐藏值，旧档案可正常加载',async()=>{
  storage={};
  const p=page('profile');p.onLoad();
  p.setData({form:{...profile,goal:'减脂',targetWeight:''},consent:true});
  p.save();await tick();assert.equal(store.read().profile,null);assert.equal(toasts.at(-1),'请填写有效的目标体重');
  p.input(event({field:'targetWeight'},'60.5'));p.save();await tick();assert.equal(store.read().profile.targetWeight,60.5);
  const reopened=page('profile');reopened.onLoad();assert.equal(reopened.data.form.targetWeight,60.5);
  reopened.choose(event({field:'goal',value:'增肌'}));reopened.input(event({field:'targetWeight'},'70'));reopened.save();await tick();assert.equal(store.read().profile.targetWeight,70);
  reopened.choose(event({field:'goal',value:'维持'}));reopened.save();await tick();assert.equal(Object.hasOwn(store.read().profile,'targetWeight'),false);
  store.write(core.regenerate(core.empty(),{...profile,goal:'减脂'}));
  const legacy=page('profile');legacy.onLoad();assert.equal(legacy.data.form.targetWeight,'');
});
test('今日体重保存与记录页共享数据，同日更新始终比较此前记录',()=>{
  storage={};const date=core.dateKey(),previous=core.addDays(date,-1);
  const state=core.regenerate(core.empty(),{...profile,goal:'减脂',targetWeight:60});state.weights[previous]={value:64.8};store.write(state);
  const today=page('today');today.onShow();assert.equal(today.data.weightView.saved,false);
  assert.equal(today.data.weightView.targetValue,'60');
  today.inputWeight(event({},'64.5'));assert.equal(today.data.weightDirty,true);today.saveWeight();assert.equal(today.data.weightView.trend,'closer');assert.equal(today.data.weightEffects[0].type,'fireworks');
  today.inputWeight(event({},'65.1'));today.saveWeight();assert.equal(today.data.weightView.trend,'away');assert.equal(today.data.weightEffects[0].type,'flowers');
  today.inputWeight(event({},'64.8'));today.saveWeight();assert.equal(today.data.weightView.trend,'same');assert.equal(today.data.weightEffects[0].type,'flowers');
  assert.equal(Object.keys(store.read().weights).length,2);
  const records=page('records');records.onShow();assert.ok(records.data.weights.some(w=>w.date===date&&w.value===64.8));
  const lastEffect=today.data.weightEffects[0].id;today.inputWeight(event({},''));today.saveWeight();assert.equal(store.read().weights[date].value,64.8);assert.equal(today.data.weightDirty,true);assert.equal(today.data.weightEffects[0].id,lastEffect);
  records.setData({weightDate:date,weightValue:'64.2'});records.saveWeight();today.onShow();assert.equal(today.data.weightInput,'64.2');assert.equal(today.data.weightView.trend,'closer');
  today.onHide();assert.deepEqual(today.data.weightEffects,[]);assert.equal(today._weightEffectTimer,null);
});
test('无目标仅展示鲜花，保存失败不产生新特效，页面退出清理动画',()=>{
  storage={};store.write(core.regenerate(core.empty(),profile));const today=page('today');today.onShow();
  today.inputWeight(event({},'64.5'));today.saveWeight();assert.equal(today.data.weightEffects[0].type,'flowers');
  const id=today.data.weightEffects[0].id,original=wx.setStorageSync;
  try{wx.setStorageSync=()=>{throw Error('存储失败');};today.inputWeight(event({},'64'));today.saveWeight();assert.equal(today.data.weightEffects[0].id,id);assert.equal(toasts.at(-1),'存储失败');}finally{wx.setStorageSync=original;today.onUnload();}
  assert.deepEqual(today.data.weightEffects,[]);
});
