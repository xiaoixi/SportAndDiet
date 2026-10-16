// 开发演示数据，不作为经专业审核的生产模板。营养值为每 100g 可食部示例估算。
const exercises = [
  {id:'march',name:'原地踏步',part:'全身热身',phase:'热身',sets:1,reps:60,unit:'秒',rest:20,equipment:'无器械',group:'warm',steps:'自然站立，交替抬脚并轻摆双臂，保持平稳呼吸。',caution:'以舒适速度进行，不追求抬腿高度。',image:'/assets/march.svg'},
  {id:'sit',name:'椅子坐站',part:'下肢',phase:'主训练',sets:2,reps:10,unit:'次',rest:45,equipment:'无器械',group:'legs',steps:'将稳固椅子靠墙，双脚踩稳，缓慢坐下，再平稳站起。',caution:'避免椅子滑动；膝部不适时停止。',image:'/assets/squat.svg'},
  {id:'squat',name:'徒手浅蹲',part:'下肢',phase:'主训练',sets:2,reps:10,unit:'次',rest:45,equipment:'无器械',group:'legs',steps:'双脚舒适分开，髋部向后，屈膝到舒适幅度，再站起。',caution:'脚掌保持着地，不强求深度。',image:'/assets/squat.svg'},
  {id:'wall',name:'墙壁俯卧撑',part:'胸肩与上肢',phase:'主训练',sets:2,reps:10,unit:'次',rest:45,equipment:'无器械',group:'push',steps:'面对墙站立，双手扶墙，屈肘缓慢靠近，再推回。',caution:'身体保持稳定，避免耸肩和腰部塌陷。',image:'/assets/push.svg'},
  {id:'counter',name:'高位支撑俯卧撑',part:'胸肩与上肢',phase:'主训练',sets:2,reps:8,unit:'次',rest:45,equipment:'无器械',group:'push',steps:'双手撑在固定稳固的高台面，身体保持直线，缓慢屈伸手肘。',caution:'台面必须稳固；可改回墙壁版本。',image:'/assets/push.svg'},
  {id:'bridge',name:'臀桥',part:'臀部与核心',phase:'主训练',sets:2,reps:12,unit:'次',rest:45,equipment:'无器械',group:'core',steps:'仰卧屈膝，双脚踩地，收紧臀部抬髋，再缓慢放回。',caution:'避免用腰部过度后仰代偿。',image:'/assets/bridge.svg'},
  {id:'bird',name:'四点支撑伸展',part:'臀部与核心',phase:'主训练',sets:2,reps:8,unit:'次',rest:45,equipment:'无器械',group:'core',steps:'双手双膝支撑，缓慢伸出一侧手臂与对侧腿，再换边。',caution:'保持躯干平稳，舒适范围内完成。',image:'/assets/bird.svg'},
  {id:'relax',name:'站姿放松与呼吸',part:'全身放松',phase:'放松',sets:1,reps:60,unit:'秒',rest:0,equipment:'无器械',group:'cool',steps:'缓慢走动，放松双肩，保持自然呼吸。',caution:'不要憋气或强行拉伸。',image:'/assets/march.svg'}
];
const foods = [
  {id:'oat',name:'燕麦片',category:'主食',basis:'干重',kcal:370,p:13,c:62,f:7,allergens:['麸质'],vegan:true},
  {id:'rice',name:'米饭',category:'主食',basis:'熟重',kcal:116,p:2.6,c:25.9,f:.3,allergens:[],vegan:true},
  {id:'sweet',name:'蒸红薯',category:'主食',basis:'熟重',kcal:86,p:1.6,c:20,f:.1,allergens:[],vegan:true},
  {id:'egg',name:'水煮鸡蛋',category:'蛋白质',basis:'熟重 / 去壳',kcal:144,p:13,c:2.8,f:8.8,allergens:['鸡蛋'],vegan:false},
  {id:'chicken',name:'清蒸鸡胸肉',category:'蛋白质',basis:'熟重',kcal:165,p:31,c:0,f:3.6,allergens:[],vegan:false},
  {id:'tofu',name:'豆腐',category:'蛋白质',basis:'可食部',kcal:84,p:8,c:3,f:4,allergens:['大豆'],vegan:true},
  {id:'beans',name:'熟鹰嘴豆',category:'蛋白质',basis:'熟重',kcal:164,p:8.9,c:27.4,f:2.6,allergens:[],vegan:true},
  {id:'broccoli',name:'西兰花',category:'蔬菜',basis:'熟重',kcal:35,p:2.4,c:7.2,f:.4,allergens:[],vegan:true},
  {id:'carrot',name:'胡萝卜',category:'蔬菜',basis:'熟重',kcal:35,p:.8,c:8.2,f:.2,allergens:[],vegan:true},
  {id:'apple',name:'苹果',category:'水果',basis:'可食部',kcal:52,p:.3,c:13.8,f:.2,allergens:[],vegan:true},
  {id:'banana',name:'香蕉',category:'水果',basis:'可食部 / 去皮',kcal:89,p:1.1,c:22.8,f:.3,allergens:[],vegan:true}
];
module.exports = { version:'demo-1', status:'demo', source:'开发演示估算；未计烹饪油及调味料，不代表全天摄入目标', exercises, foods };
