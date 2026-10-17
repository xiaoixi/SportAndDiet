const {addDays}=require('./core');
// 只比较日期早于当天的记录，同日修改不会改变比较基准。
function parseWeight(input) {
  const value = Number(input);
  if (!Number.isFinite(value) || value < 30 || value > 250) throw Error('请输入 30—250 kg 的有效体重');
  return value;
}

function format(value) { return Number(value.toFixed(2)).toString(); }

function weightView(state, date) {
  const profile = state.profile;
  const records = state.weights || {};
  const yesterdayDate = addDays(date, -1);
  const yesterdayRecord = records[yesterdayDate];
  const previousDate = Object.keys(records).filter(day => day < date && Number.isFinite(records[day].value)).sort().pop();
  const reference = previousDate ? Number(records[previousDate].value) : profile ? Number(profile.weight) : null;
  const target = profile && Number(profile.targetWeight);
  const canCompare = !!(profile && ['减脂', '增肌'].includes(profile.goal) && Number.isFinite(target) && target > 0);
  const saved = !!(records[date] && Number.isFinite(records[date].value));
  const value = saved ? records[date].value : null;
  const result = {
    saved, value: saved ? String(value) : '', trend: saved ? 'neutral' : 'unrecorded',
    yesterdayDate, yesterdayValue: yesterdayRecord && Number.isFinite(yesterdayRecord.value) ? format(yesterdayRecord.value) : '',
    label: saved ? '已记录' : '待记录', icon: 'sun',
    title: '认真记录，也是一种进步。',
    detail: '按自己的节奏，继续记录生活中的小变化。',
    reference: Number.isFinite(reference) ? (previousDate ? '上次 ' : '建档 ') + format(reference) + ' kg' : '开始记录今天的自己',
    referenceDate: previousDate || null,
    targetLabel: canCompare ? profile.goal + '目标 ' + format(target) + ' kg' : profile ? '记录自己的节奏' : '建立档案后保存记录',
    planLabel: canCompare ? profile.goal + '计划' : profile ? profile.goal + (['减脂','增肌'].includes(profile.goal) ? '计划 · 设置目标' : '') : '',
    distance: '', canCompare, targetValue: canCompare ? format(target) : '', goal: profile ? profile.goal : ''
  };
  if (!saved || !canCompare || !Number.isFinite(reference)) return result;
  const currentGrams = Math.round(value * 1000);
  const referenceGrams = Math.round(reference * 1000);
  const targetGrams = Math.round(target * 1000);
  const improvement = Math.abs(referenceGrams - targetGrams) - Math.abs(currentGrams - targetGrams);
  const amount = format(Math.abs(improvement) / 1000);
  result.distance = '距目标 ' + format(Math.abs(currentGrams - targetGrams) / 1000) + ' kg';
  if (currentGrams === referenceGrams) {
    Object.assign(result, { trend: 'same', label: '稳稳保持', icon: 'sun', title: '稳稳保持，也值得肯定。', detail: '体重与' + (previousDate ? '上次' : '建档时') + '相同，认真照顾自己的每一天都有意义。' });
  } else if (improvement > 0) {
    Object.assign(result, { trend: 'closer', label: '值得喝彩', icon: 'trophy', title: '为你的小进步喝彩！', detail: '比' + (previousDate ? '上次' : '建档时') + '更接近目标 ' + amount + ' kg，照顾自己的每一步都算数。' });
  } else if (improvement < 0) {
    Object.assign(result, { trend: 'away', label: '继续加油', icon: 'heart-handshake', title: '给自己一点耐心，继续就好。', detail: '比' + (previousDate ? '上次' : '建档时') + '离目标远了 ' + amount + ' kg。给身体一点时间，按自己的节奏来。' });
  } else {
    Object.assign(result, { trend: 'same', label: '距离不变', icon: 'sun', title: '保持自己的节奏，就很好。', detail: '本次体重有所变化，但与目标的距离相同。继续好好照顾自己。' });
  }
  return result;
}

module.exports = { parseWeight, weightView };
