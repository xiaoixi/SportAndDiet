function fail(message){const error=Error(message);error.public=true;throw error;}
function plain(value){return value&&typeof value==='object'&&!Array.isArray(value);}
function safe(value){
  if(value&&typeof value==='object')Object.keys(value).forEach(key=>{if(['__proto__','prototype','constructor'].includes(key)||key.startsWith('$')||key.includes('.'))fail('包含不支持的数据字段');safe(value[key]);});
}
function text(value,max=500){return typeof value==='string'&&value.length>0&&value.length<=max;}
function catalog(value){
  if(!plain(value)||!text(value.source,1000)||!Array.isArray(value.exercises)||!Array.isArray(value.foods))fail('内容缺少 source、exercises 或 foods');
  if(value.exercises.length>100||value.foods.length>200||value.exercises.length<4||value.foods.length<4)fail('动作或食物数量超出允许范围');
  const groups=['warm','legs','push','core','cool'];
  const exerciseIds=new Set(),foodIds=new Set();
  value.exercises.forEach(e=>{
    if(!text(e.id,60)||exerciseIds.has(e.id)||!text(e.name,100)||!text(e.steps,1000)||!text(e.caution,1000)||!text(e.part,100)||!text(e.equipment,100)||!['热身','主训练','放松'].includes(e.phase)||!groups.includes(e.group))fail('动作字段缺失或重复');
    if(!Number.isInteger(e.sets)||e.sets<1||e.sets>10||!Number.isFinite(e.reps)||e.reps<=0||e.reps>3600||!Number.isFinite(e.rest)||e.rest<0||e.rest>600||!['次','秒'].includes(e.unit))fail('动作组数、次数或休息时间不正确');
    if(!['/assets/march.svg','/assets/squat.svg','/assets/push.svg','/assets/bridge.svg','/assets/bird.svg'].includes(e.image))fail('请使用工程内已有的动作示意图');
    exerciseIds.add(e.id);
  });
  if(groups.some(g=>!value.exercises.some(e=>e.group===g)))fail('内容需覆盖热身、下肢、推、核心与放松');
  value.foods.forEach(f=>{
    if(!text(f.id,60)||foodIds.has(f.id)||!text(f.name,100)||!text(f.basis,100)||!['主食','蛋白质','蔬菜','水果'].includes(f.category)||!Array.isArray(f.allergens)||f.allergens.some(a=>!text(a,40))||typeof f.vegan!=='boolean')fail('食物字段缺失或重复');
    ['kcal','p','c','f'].forEach(k=>{if(!Number.isFinite(f[k])||f[k]<0||f[k]>(k==='kcal'?1000:100))fail('营养数值不正确');});
    foodIds.add(f.id);
  });
  if(['主食','蛋白质','蔬菜','水果'].some(c=>!value.foods.some(f=>f.category===c)))fail('食物需覆盖主食、蛋白质、蔬菜和水果');
  safe(value);return value;
}
function state(value){
  if(!plain(value)||value.schema!==1||!['plans','sessions','meals','weights','catalog'].every(k=>plain(value[k])))fail('数据格式不正确');
  if(Buffer.byteLength(JSON.stringify(value),'utf8')>750000)fail('记录超过当前同步容量，请先导出并整理历史记录');
  if(value.profile!==null&&!plain(value.profile))fail('档案格式不正确');
  safe(value);catalog(value.catalog);
  Object.keys(value.plans).forEach(d=>{const p=value.plans[d];if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!plain(p)||p.date!==d||!Array.isArray(p.meals)||!Array.isArray(p.exercises))fail('计划格式不正确');});
  Object.keys(value.weights).forEach(d=>{const w=value.weights[d];if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!w||!Number.isFinite(w.value)||w.value<30||w.value>250)fail('体重记录不正确');});
  return value;
}
module.exports={fail,state,catalog};
