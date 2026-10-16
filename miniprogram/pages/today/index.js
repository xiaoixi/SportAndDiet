const core=require('../../lib/core'),store=require('../../lib/store'),ui=require('../../lib/ui');
Page({
  data:{},
  onShow(){ui.run(()=>{const state=store.touch(),date=core.dateKey();let display=state;if(!state.profile){display=core.regenerate(core.empty(),{age:28,height:170,weight:65,goal:'养成习惯',minutes:25,days:[1,3,5],allergies:[],avoid:'',vegan:false,experience:'新手',place:'居家',equipment:'无器械'},date);}this.setData({date,day:ui.dayView(display,date),demo:!state.profile,sync:store.status().label});});},
  profile:ui.profile,
  workout(){if(ui.requireProfile())ui.navigate('workout',{date:this.data.date});},
  meal(e){if(ui.requireProfile())ui.navigate('meal',{date:this.data.date,id:e.currentTarget.dataset.id});},
  plans(){wx.switchTab({url:'/pages/plan/index'});}
});
