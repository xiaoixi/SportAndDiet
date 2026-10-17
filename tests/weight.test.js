const {test}=require('node:test');
const assert=require('node:assert/strict');
const {weightView,parseWeight}=require('../miniprogram/lib/weight');
function state(goal='减脂',target=60,current=64.5){return {profile:{goal,targetWeight:target,weight:65},weights:{'2026-10-15':{value:64.8},'2026-10-17':{value:current}}};}
test('减脂进步、偏离、不变具有不同配色状态和鼓励图标',()=>{
  const positive=weightView(state(),'2026-10-17');assert.equal(positive.trend,'closer');assert.equal(positive.icon,'trophy');assert.match(positive.detail,/0.3 kg/);assert.equal(positive.planLabel,'减脂计划');
  const away=weightView(state('减脂',60,65.1),'2026-10-17');assert.equal(away.trend,'away');assert.equal(away.icon,'heart-handshake');
  const same=weightView(state('减脂',60,64.8),'2026-10-17');assert.equal(same.trend,'same');assert.equal(same.icon,'sun');
});
test('增肌按到目标的距离判断，达到或越过目标时也正确',()=>{
  assert.equal(weightView(state('增肌',70,65.1),'2026-10-17').planLabel,'增肌计划');
  assert.equal(weightView(state('增肌',70,65.1),'2026-10-17').trend,'closer');
  assert.equal(weightView(state('增肌',70,64.5),'2026-10-17').trend,'away');
  assert.equal(weightView(state('增肌',70,70),'2026-10-17').distance,'距目标 0 kg');
  assert.equal(weightView(state('减脂',64.7,64.6),'2026-10-17').label,'距离不变');
});
test('比较最近的此前记录，忽略同日和未来记录，重复保存不改变基准',()=>{
  const s=state();s.weights['2026-10-16']={value:64.7};s.weights['2026-10-18']={value:40};
  let view=weightView(s,'2026-10-17');assert.equal(view.referenceDate,'2026-10-16');assert.match(view.detail,/0.2 kg/);
  s.weights['2026-10-17'].value=64.9;view=weightView(s,'2026-10-17');assert.equal(view.trend,'away');assert.equal(view.reference,'上次 64.7 kg');
});
test('没有历史时参考建档体重，没有目标或非体重目标时仅记录',()=>{
  const s=state();delete s.weights['2026-10-15'];assert.equal(weightView(s,'2026-10-17').reference,'建档 65 kg');assert.equal(weightView(s,'2026-10-17').trend,'closer');
  for(const goal of ['维持','养成习惯']){s.profile.goal=goal;assert.equal(weightView(s,'2026-10-17').trend,'neutral');}
  s.profile.goal='减脂';delete s.profile.targetWeight;assert.equal(weightView(s,'2026-10-17').canCompare,false);
  delete s.weights['2026-10-17'];assert.equal(weightView(s,'2026-10-17').saved,false);
  assert.equal(weightView({profile:null,weights:{}},'2026-10-17').trend,'unrecorded');
});
test('体重输入校验与已有记录入口保持一致',()=>{
  assert.equal(parseWeight('64.5'),64.5);
  for(const value of ['',0,-1,'abc',Infinity,29,251])assert.throws(()=>parseWeight(value),/有效体重/);
});
test('昨日体重按确切日期读取，无昨日记录不使用更早记录代替，支持跨月',()=>{
  const s=state();assert.equal(weightView(s,'2026-10-17').yesterdayValue,'');
  s.weights['2026-10-16']={value:64.7};assert.equal(weightView(s,'2026-10-17').yesterdayValue,'64.7');
  s.weights['2026-09-30']={value:66};const next=weightView(s,'2026-10-01');assert.equal(next.yesterdayDate,'2026-09-30');assert.equal(next.yesterdayValue,'66');
});
