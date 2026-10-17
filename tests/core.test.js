const {test}=require('node:test'),assert=require('node:assert/strict'),core=require('../miniprogram/lib/core');
const seed=require('../miniprogram/lib/catalog');
const profile={age:28,height:170,weight:65,goal:'维持',minutes:25,days:[1,3,5],allergies:[],avoid:'',vegan:false,experience:'新手',place:'居家',equipment:'无器械'};
test('北京时间跨日、跨月与日期校验',()=>{assert.equal(core.dateKey(Date.parse('2026-10-16T16:00:00Z')),'2026-10-17');assert.equal(core.addDays('2026-12-31',1),'2027-01-01');assert.equal(core.validDate('2026-02-30'),false);assert.equal(core.validDate('bad'),false);});
test('生成七日计划，三次训练并包含热身及放松',()=>{const s=core.regenerate(core.empty(),profile,'2026-10-12');assert.equal(Object.keys(s.plans).length,7);assert.equal(Object.values(s.plans).filter(p=>p.training).length,3);assert.equal(s.plans['2026-10-12'].exercises[0].phase,'热身');assert.equal(s.plans['2026-10-12'].exercises.at(-1).phase,'放松');});
test('过敏、忌口和纯植物限制同时生效',()=>{const p={...profile,vegan:true,allergies:['大豆','麸质'],avoid:'胡萝卜'};const s=core.regenerate(core.empty(),p,'2026-10-12');Object.values(s.plans).forEach(day=>day.meals.forEach(m=>m.items.forEach(f=>{assert.equal(f.vegan,true);assert.ok(!f.allergens.includes('大豆'));assert.ok(!f.allergens.includes('麸质'));assert.notEqual(f.name,'胡萝卜');})));});
test('无法匹配时保持旧计划不变',()=>{const s=core.regenerate(core.empty(),profile,'2026-10-12'),before=JSON.stringify(s);assert.throws(()=>core.regenerate(s,{...profile,avoid:'鸡蛋,鸡胸肉,豆腐,鹰嘴豆'},'2026-10-12'),/没有符合/);assert.equal(JSON.stringify(s),before);});
test('特殊情况、无效数值和相邻训练日期被阻止',()=>{assert.throws(()=>core.validateProfile({...profile,age:17}));assert.throws(()=>core.validateProfile({...profile,weight:NaN}));assert.throws(()=>core.validateProfile({...profile,limitations:'膝部不适'}));assert.throws(()=>core.validateProfile({...profile,days:[6,0]}));});
test('重新生成不改写历史、训练中以及已记录餐次的计划',()=>{const s=core.regenerate(core.empty(),profile,'2026-10-12');s.sessions['2026-10-14']=core.session(s.plans['2026-10-14']);s.meals['2026-10-15|lunch']={items:[]};const next=core.regenerate(s,{...profile,minutes:15},'2026-10-14');assert.deepEqual(next.plans['2026-10-12'],s.plans['2026-10-12']);assert.deepEqual(next.plans['2026-10-14'],s.plans['2026-10-14']);assert.deepEqual(next.plans['2026-10-15'],s.plans['2026-10-15']);assert.equal(next.plans['2026-10-16'].minutes,15);});
test('训练计时暂停、恢复与休息倒计时',()=>{const s=core.session(core.generateDay(profile,'2026-10-12'),1000);s.restUntil=10000;core.pause(s,5000);assert.equal(core.seconds(s,12000),4);assert.equal(s.restRemaining,5000);core.resume(s,20000);assert.equal(s.restUntil,25000);assert.equal(core.seconds(s,22000),6);core.finish(s,23000);assert.equal(s.status,'部分完成');assert.equal(core.seconds(s,50000),7);});
test('只有完整完成所有组才计为已完成，跳过不伪装完成',()=>{const s=core.session(core.generateDay(profile,'2026-10-12'));s.exercises.forEach(e=>e.logs=Array.from({length:e.sets},()=>({amount:e.reps})));core.finish(s);assert.equal(s.status,'已完成');s.exercises[0].skipped=true;core.finish(s);assert.equal(s.status,'部分完成');});
test('休息日不进入训练分母，餐次幂等及删除后重新汇总',()=>{const s=core.regenerate(core.empty(),profile,'2026-10-12'),date='2026-10-12';s.sessions[date]={status:'已完成'};s.meals[date+'|breakfast']={items:[]};s.meals[date+'|breakfast']={items:[]};let stats=core.stats(s,Object.keys(s.plans));assert.equal(stats.training,3);assert.equal(stats.trainingRate,33);assert.equal(stats.recorded,1);delete s.meals[date+'|breakfast'];assert.equal(core.stats(s,Object.keys(s.plans)).recorded,0);assert.equal(core.stats(core.empty(),[]).trainingRate,null);});
test('营养随份量重算，未知项保持未知标识',()=>{assert.equal(core.nutrition([{...seed.foods[0],grams:200}]).kcal,740);assert.equal(core.nutrition([{grams:100,kcal:null}]).unknown,true);assert.equal(core.nutrition([{grams:100,kcal:100,p:null,c:null,f:null}]).unknown,true);});
test('训练改期保留餐食并校验恢复间隔',()=>{const s=core.regenerate(core.empty(),{...profile,days:[1]},'2026-10-12');const next=core.moveTraining(s,'2026-10-12','2026-10-14','2026-10-12');assert.equal(next.plans['2026-10-12'].training,false);assert.equal(next.plans['2026-10-14'].training,true);assert.deepEqual(next.plans['2026-10-12'].meals,s.plans['2026-10-12'].meals);const busy=core.regenerate(core.empty(),profile,'2026-10-12');assert.throws(()=>core.moveTraining(busy,'2026-10-12','2026-10-13','2026-10-12'),/相邻/);});
test('自填训练时间支持非预设整数，按时长分配训练量',()=>{
  for(const minutes of [1,4,5,20,30,45,60,120,121,180,1440,10000]){
    const day=core.generateDay({...profile,minutes},'2026-10-12');
    assert.equal(day.minutes,minutes);
    assert.ok(day.exercises.some(e=>e.phase==='热身'));
    assert.ok(day.exercises.some(e=>e.phase==='放松'));
  }
  const short=core.generateDay({...profile,minutes:10},'2026-10-12');
  const long=core.generateDay({...profile,minutes:45},'2026-10-12');
  assert.ok(long.exercises.reduce((sum,e)=>sum+e.sets,0)>short.exercises.reduce((sum,e)=>sum+e.sets,0));
  for(const minutes of ['',0,-1,NaN,Infinity,25.5,'abc',Number.MAX_SAFE_INTEGER+1])assert.throws(()=>core.validateProfile({...profile,minutes}),/正整数/);
});
