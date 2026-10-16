const core=require('../../lib/core'),store=require('../../lib/store'),ui=require('../../lib/ui');
Page({
 data:{date:'',plan:null,session:null,elapsed:'00:00',rest:0,done:0,total:0,future:false},
 onLoad(o){this.setData({date:o.date||core.dateKey()});},
 onShow(){this.refresh();this.timer=setInterval(()=>this.clock(),1000);},onHide(){clearInterval(this.timer);},onUnload(){clearInterval(this.timer);},
 refresh(){const state=store.read(),plan=state.plans[this.data.date],s=state.sessions[this.data.date]||null;this.setData({plan,session:s,future:this.data.date>core.dateKey(),done:s?s.exercises.reduce((n,e)=>n+e.logs.length,0):0,total:s?s.exercises.reduce((n,e)=>n+e.sets,0):0});this.clock();},
 clock(){const s=this.data.session;if(!s)return;const seconds=core.seconds(s);this.setData({elapsed:String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0'),rest:Math.ceil(Math.max(0,s.runningSince?(s.restUntil||0)-Date.now():s.restRemaining||0)/1000)});},
 commit(fn){ui.run(()=>{store.update(state=>{fn(state);return state;});this.refresh();});},
 start(){if(this.data.future)return ui.toast('未来训练可预览，到当天再开始');this.commit(state=>{if(!state.sessions[this.data.date])state.sessions[this.data.date]=core.session(state.plans[this.data.date]);});},
 toggle(){this.commit(state=>{const s=state.sessions[this.data.date];if(s.runningSince)core.pause(s);else core.resume(s);});},
 details(e){const id=e.currentTarget.dataset.id,items=this.data.session?this.data.session.exercises:this.data.plan.exercises,item=items.find(x=>x.id===id);wx.showModal({title:item.name,content:item.steps+'\n\n注意：'+item.caution,showCancel:false});},
 async log(e){await ui.run(async()=>{const index=Number(e.currentTarget.dataset.index),s=this.data.session,x=s.exercises[index];if(!s.runningSince)throw Error('请先继续训练');if(x.logs.length>=x.sets||x.skipped)return;const r=await wx.showModal({title:'记录本组实际次数 / 秒数',editable:true,placeholderText:String(x.reps),content:String(x.reps)});if(!r.confirm)return;const amount=Number(r.content);if(!Number.isFinite(amount)||amount<=0||amount>3600)throw Error('请输入 1—3600 的有效数值');this.commit(state=>{const ss=state.sessions[this.data.date],ex=ss.exercises[index];if(ex.logs.length!==x.logs.length)return;ex.logs.push({amount,weight:Number(this.weights&&this.weights[index]||0),at:Date.now()});ss.restUntil=Date.now()+ex.rest*1000;});});},
 weight(e){const value=Number(e.detail.value);this.weights=this.weights||{};this.weights[e.currentTarget.dataset.index]=Number.isFinite(value)&&value>=0&&value<=500?value:0;},
 skip(e){const index=Number(e.currentTarget.dataset.index);this.commit(state=>{const x=state.sessions[this.data.date].exercises[index];x.skipped=!x.skipped;});},
 replace(e){ui.run(async()=>{const index=Number(e.currentTarget.dataset.index),s=this.data.session,x=s.exercises[index];if(x.logs.length)throw Error('已有记录的动作不能替换');const choices=store.read().catalog.exercises.filter(a=>a.group===x.group&&a.id!==x.id);if(!choices.length)throw Error('暂无同类替代动作');const result=await wx.showActionSheet({itemList:choices.map(a=>a.name+' · 同训练部位')});this.commit(state=>{const old=state.sessions[this.data.date].exercises[index];state.sessions[this.data.date].exercises[index]=Object.assign(core.clone(choices[result.tapIndex]),{sets:old.sets,logs:[],skipped:false});});});},
 feeling(e){this.commit(state=>{state.sessions[this.data.date].feeling=e.currentTarget.dataset.value;});},
 note(e){this.commit(state=>{state.sessions[this.data.date].note=e.detail.value;});},
 end(){ui.run(async()=>{const r=await wx.showModal({title:'结束本次训练？',content:'只保存实际完成的组数，未完成的训练会记为部分完成。'});if(r.confirm)this.commit(state=>core.finish(state.sessions[this.data.date]));});},
 discomfort(){ui.run(async()=>{const r=await wx.showModal({title:'先停下来，照顾好身体',content:'请停止当前动作。如不适持续，请寻求专业帮助。确认后结束并保存不适反馈。',confirmText:'停止训练'});if(r.confirm)this.commit(state=>{const s=state.sessions[this.data.date];s.note=(s.note||'')+' [训练中不适]';core.finish(s);});});},
 skipDay(){this.commit(state=>{const s=core.session(state.plans[this.data.date]);core.pause(s);s.status='已跳过';state.sessions[this.data.date]=s;});}
});
