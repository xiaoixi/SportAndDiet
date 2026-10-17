function createWeightEffect(progress, id) {
  const effect = {
    id, type: progress ? 'fireworks' : 'flowers',
    title: progress ? '为你的进步喝彩！' : '送你鲜花，也送你鼓励。',
    detail: progress ? '每一小步，都值得庆祝。' : '认真记录、照顾自己，每一天都算数。',
    sparks: [], flowers: []
  };
  if (progress) {
    const colors = ['#ffab36', '#f16e70', '#62b397', '#ed8bc0', '#dcad48'];
    [[24,29],[77,37],[50,20]].forEach(([x,y],group) => {
      for (let i=0;i<16;i++) {
        const angle = i * Math.PI / 8;
        const radius = 150 + (i % 3) * 25;
        effect.sparks.push({id:group+'-'+i,x,y,dx:Math.round(Math.cos(angle)*radius),dy:Math.round(Math.sin(angle)*radius),angle:i*22.5,delay:group*260,color:colors[(i+group)%colors.length]});
      }
    });
  } else {
    for (let i=0;i<16;i++) {
      effect.flowers.push({id:i,x:5+(i*23)%90,y:32+(i%4)*7,dx:((i%5)-2)*30,angle:(i%2===0?1:-1)*(25+i*7),size:48+(i%3)*15,delay:(i%5)*130,asset:i%3===0?'flower-gold':'flower-coral'});
    }
  }
  return effect;
}
module.exports = { createWeightEffect };
