const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const {createWeightEffect}=require('../miniprogram/lib/weight-effects');
test('烟花与鲜花生成可渲染的粒子，鲜花素材真实存在',()=>{
  const fireworks=createWeightEffect(true,1),flowers=createWeightEffect(false,2);
  assert.equal(fireworks.type,'fireworks');assert.equal(flowers.type,'flowers');assert.notEqual(fireworks.id,flowers.id);
  assert.ok(fireworks.sparks.length>0&&fireworks.sparks.length<=64);
  for(const p of fireworks.sparks){assert.ok([p.x,p.y,p.dx,p.dy,p.angle,p.delay].every(Number.isFinite));assert.ok(p.x>=0&&p.x<=100&&p.y>=0&&p.y<=100);}
  assert.ok(flowers.flowers.length>0&&flowers.flowers.length<=24);
  for(const p of flowers.flowers)assert.ok(fs.existsSync(path.join(__dirname,'../miniprogram/assets/celebration',p.asset+'.svg')));
});
