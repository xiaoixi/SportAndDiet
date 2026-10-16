const seed = require('./catalog');
const clone = value => JSON.parse(JSON.stringify(value));
function dateKey(time = Date.now()) { return new Date(time + 8 * 3600000).toISOString().slice(0,10); }
// 日期运算用 UTC 中午，避免偏移至前一天。
function shift(date, n) { return new Date(Date.parse(date + 'T12:00:00Z') + n * 86400000).toISOString().slice(0,10); }
function weekday(date) { return new Date(date + 'T12:00:00Z').getUTCDay(); }
function validDate(date) { return typeof date==='string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date+'T12:00:00Z')) && shift(date,0) === date; }
function empty() { return {schema:1,profile:null,plans:{},sessions:{},meals:{},weights:{},catalog:clone(seed)}; }
function validateProfile(p) {
  if (!p || !Number.isFinite(Number(p.age)) || p.age < 18 || p.age > 100) throw Error('自动计划仅支持 18—100 岁成年用户');
  if (p.height < 100 || p.height > 230 || !Number.isFinite(Number(p.height))) throw Error('请填写 100—230 cm 的有效身高');
  if (p.weight < 30 || p.weight > 250 || !Number.isFinite(Number(p.weight))) throw Error('请填写 30—250 kg 的有效体重');
  if (p.limitations && p.limitations.trim()) throw Error('存在身体限制或特殊情况时，请先获得专业指导，暂不生成通用计划');
  if (!['减脂','增肌','维持','养成习惯'].includes(p.goal)) throw Error('请选择目标');
  if (![15,25,35].includes(Number(p.minutes))) throw Error('请选择单次训练时间');
  if (!Array.isArray(p.days) || !p.days.length || p.days.length > 3 || p.days.some(d => !Number.isInteger(d) || d < 0 || d > 6)) throw Error('请选择每周 1—3 个训练日');
  if (new Set(p.days).size !== p.days.length || p.days.some(d => p.days.includes((d+1)%7))) throw Error('请在两次训练之间保留至少一天恢复时间');
  if (!Array.isArray(p.allergies) || typeof p.avoid !== 'string') throw Error('饮食限制格式不正确');
  return p;
}
function allowed(food, profile) {
  if (profile.vegan && !food.vegan) return false;
  if ((food.allergens || []).some(a => (profile.allergies || []).includes(a))) return false;
  const tokens = (profile.avoid || '').split(/[，,、\s]+/).filter(Boolean);
  return !tokens.some(t => food.name.includes(t) || (food.allergens || []).some(a => a.includes(t)));
}
function nutrition(items) {
  const out = {kcal:0,p:0,c:0,f:0,unknown:false};
  items.forEach(i => { if (['kcal','p','c','f'].some(k=>i[k]==null)) out.unknown=true; ['kcal','p','c','f'].forEach(k => {if(i[k]!=null)out[k] += Number(i[k] || 0)*(Number(i.grams)||0)/100;}); });
  ['kcal','p','c','f'].forEach(k => out[k]=Math.round(out[k]));
  return out;
}
function generateDay(profile, date, catalog = seed) {
  validateProfile(profile);
  const training = profile.days.includes(weekday(date));
  const groups = profile.minutes === 15 ? ['warm','legs','push','cool'] : ['warm','legs','push','core','cool'];
  const exercises = groups.map(group => {
    const choices = catalog.exercises.filter(e => e.group === group);
    if (!choices.length) throw Error('没有匹配的训练模板，请保留原计划并调整内容库');
    const e = clone(choices[(weekday(date) + (profile.experience === '有基础' ? 1 : 0)) % choices.length]);
    if (e.phase === '主训练') e.sets = profile.minutes === 35 ? 3 : 2;
    return e;
  });
  const specs = [['breakfast','早餐','08:00',[['主食',60],['蛋白质',100],['水果',150]]],['lunch','午餐','12:30',[['主食',180],['蛋白质',150],['蔬菜',200]]],['dinner','晚餐','18:30',[['主食',150],['蛋白质',150],['蔬菜',200]]]];
  const meals = specs.map(([id,name,time,categories],index) => ({id,name,time,items:categories.map(([category,grams]) => {
    const choices = catalog.foods.filter(f => f.category === category && allowed(f,profile));
    if (!choices.length) throw Error('“'+category+'”没有符合忌口的食物，请调整内容库或手动记录饮食');
    return Object.assign(clone(choices[(weekday(date)+index)%choices.length]), {grams});
  })}));
  return {date,version:catalog.version,goal:profile.goal,reason:`${profile.goal} · ${profile.experience} · 每周 ${profile.days.length} 次 · ${profile.place} · ${profile.equipment}`,training,title:training?'全身基础训练':'给身体一点恢复时间',minutes:profile.minutes,exercises:training?exercises:[],meals};
}
function regenerate(state, profile, today=dateKey()) {
  validateProfile(profile);
  const next = clone(state);
  for(let i=0;i<7;i++) {
    const date=shift(today,i);
    if (next.sessions[date] || Object.keys(next.meals).some(k=>k.startsWith(date+'|'))) continue;
    next.plans[date]=generateDay(profile,date,next.catalog);
  }
  next.profile=clone(profile);
  return next;
}
function ensurePlans(state, today=dateKey()) {
  if (!state.profile) return state;
  const next=clone(state);
  for(let i=0;i<7;i++){const d=shift(today,i);if(!next.plans[d]) next.plans[d]=generateDay(next.profile,d,next.catalog);}
  return next;
}
function moveTraining(state, from, to, today=dateKey()) {
  if(from<today||to<today||from===to)throw Error('只能调整今天或未来的不同日期');
  const next=clone(state),source=next.plans[from],target=next.plans[to];
  if(!source||!target||!source.training||target.training)throw Error('请选择一个已有计划的休息日');
  if(next.sessions[from]||next.sessions[to])throw Error('已有训练记录的日期不能移动');
  if(Object.keys(next.plans).some(d=>d!==from&&next.plans[d].training&&(d===shift(to,-1)||d===shift(to,1))))throw Error('目标日期与其他训练相邻，请保留至少一天恢复时间');
  ['training','title','minutes','exercises'].forEach(key=>{const value=target[key];target[key]=source[key];source[key]=value;});
  return next;
}
function session(plan, now=Date.now()) { return {date:plan.date,status:'进行中',startedAt:now,elapsed:0,runningSince:now,restUntil:0,restRemaining:0,exercises:clone(plan.exercises).map(e=>Object.assign(e,{logs:[],skipped:false})),feeling:'适中',note:''}; }
function seconds(s, now=Date.now()) { return Math.floor(((s.elapsed||0)+(s.runningSince ? now-s.runningSince : 0))/1000); }
function pause(s, now=Date.now()) { if(s.runningSince){s.elapsed += now-s.runningSince;s.runningSince=null;}s.restRemaining=Math.max(0,(s.restUntil||0)-now);s.restUntil=0;return s; }
function resume(s, now=Date.now()) { if(s.status==='进行中'&&!s.runningSince){s.runningSince=now;s.restUntil=s.restRemaining?now+s.restRemaining:0;s.restRemaining=0;}return s; }
function finish(s, now=Date.now()) { pause(s,now);s.status=s.exercises.every(e=>!e.skipped&&e.logs.length===e.sets)?'已完成':'部分完成';s.endedAt=now;s.restRemaining=0;return s; }
function stats(state, dates) {
  const plans=dates.map(d=>state.plans[d]).filter(Boolean), training=plans.filter(p=>p.training);
  const complete=training.filter(p=>state.sessions[p.date] && state.sessions[p.date].status==='已完成').length;
  const partial=training.filter(p=>state.sessions[p.date] && state.sessions[p.date].status==='部分完成').length;
  const mealTotal=plans.reduce((sum,p)=>sum+p.meals.length,0), recorded=plans.reduce((sum,p)=>sum+p.meals.filter(m=>state.meals[p.date+'|'+m.id]).length,0);
  return {complete,partial,training:training.length,recorded,mealTotal,trainingRate:training.length?Math.round(100*complete/training.length):null,mealRate:mealTotal?Math.round(100*recorded/mealTotal):null};
}
module.exports={clone,dateKey,addDays:shift,weekday,validDate,empty,validateProfile,allowed,nutrition,generateDay,regenerate,ensurePlans,moveTraining,session,seconds,pause,resume,finish,stats};
