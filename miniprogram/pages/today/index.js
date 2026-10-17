const core=require('../../lib/core'),store=require('../../lib/store'),ui=require('../../lib/ui');
const weight=require('../../lib/weight');
const {createWeightEffect}=require('../../lib/weight-effects');
Page({
  data:{weightEffects:[]},
  onShow(){ui.selectTab(this,0);this.refresh();},
  refresh(selectedDate){ui.run(()=>{
    const state=store.touch(),today=core.dateKey();
    const monday=core.addDays(today,-((core.weekday(today)+6)%7));
    const dates=Array.from({length:7},(_,index)=>core.addDays(monday,index));
    const candidate=selectedDate||this.data.date||today;
    const date=dates.includes(candidate)?candidate:today;
    let display=state;
    if(!state.profile){
      display=core.regenerate(core.empty(),{age:28,height:170,weight:65,goal:'养成习惯',minutes:25,days:[1,3,5],allergies:[],avoid:'',vegan:false,experience:'新手'},monday);
    }
    const week=dates.map((value,index)=>{
      const plan=display.plans[value];
      const training=plan?plan.training:display.profile.days.includes(core.weekday(value));
      return {date:value,label:['一','二','三','四','五','六','日'][index],num:Number(value.slice(8)),current:value===date,today:value===today,training};
    });
    const weightState=weight.weightView(state,date);
    const hasDraft=date===today&&this._weightDraftDate===today&&this._weightDraftBase===weightState.value;
    this.setData({date,today,isToday:date===today,week,day:ui.dayView(display,date),demo:!state.profile,
      weightView:weightState,weightInput:hasDraft?this._weightDraftValue:weightState.value,weightDirty:hasDraft,
      dateLabel:Number(date.slice(5,7))+' 月 '+Number(date.slice(8))+' 日，星期'+['日','一','二','三','四','五','六'][core.weekday(date)],sync:store.status().label});
  });},
  selectDate(e){
    const date=e.currentTarget.dataset.date;
    if(!this.data.week||!this.data.week.some(day=>day.date===date)||date===this.data.date)return;
    this.stopWeightEffect();
    this.refresh(date);
  },
  profile:ui.profile,
  onHide(){this.stopWeightEffect();},
  onUnload(){this.stopWeightEffect();},
  stopWeightEffect(){clearTimeout(this._weightEffectTimer);this._weightEffectTimer=null;this.setData({weightEffects:[]});},
  playWeightEffect(progress){
    clearTimeout(this._weightEffectTimer);
    this._weightEffectSequence=(this._weightEffectSequence||0)+1;
    this.setData({weightEffects:[createWeightEffect(progress,this._weightEffectSequence)]});
    this._weightEffectTimer=setTimeout(()=>this.stopWeightEffect(),3600);
  },
  inputWeight(e){if(this.data.date!==core.dateKey())return;this._weightDraftDate=this.data.date;this._weightDraftBase=this.data.weightView.value;this._weightDraftValue=e.detail.value;this.setData({weightInput:e.detail.value,weightDirty:true});},
  saveWeight(){ui.run(()=>{
    if(this.data.date!==core.dateKey())throw Error('只能修改和保存今天的体重');
    if(!ui.requireProfile())return;
    const value=weight.parseWeight(this.data.weightInput),date=this.data.date;
    store.update(state=>{state.weights[date]={value,recordedAt:Date.now()};return state;});
    this._weightDraftDate=null;this._weightDraftValue='';
    this.refresh(date);
    // 只有本地保存成功后才播放；目标距离更近为烟花，其余情况为鲜花。
    const feedback=weight.weightView(store.read(),date);
    this.playWeightEffect(feedback.trend==='closer');
  });},
  workout(){if(ui.requireProfile())ui.navigate('workout',{date:this.data.date});},
  meal(e){if(ui.requireProfile())ui.navigate('meal',{date:this.data.date,id:e.currentTarget.dataset.id});},
  plans(){wx.switchTab({url:'/pages/plan/index'});}
});
