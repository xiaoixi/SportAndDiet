const core=require('../../lib/core'),store=require('../../lib/store'),ui=require('../../lib/ui');
Page({
 data:{form:{age:'',height:'',weight:'',goal:'养成习惯',minutes:25,days:[1,3,5],allergies:[],avoid:'',vegan:false,experience:'新手',place:'居家',equipment:'无器械',limitations:''},goals:['减脂','增肌','维持','养成习惯'],experiences:['新手','有基础'],places:['居家','健身房'],equipment:['无器械','哑铃'],times:[15,25,35],days:[],allergies:[],consent:false},
 onLoad(){const p=store.read().profile;if(p)this.setData({form:p,consent:true});this.options();},
 options(){this.setData({days:['日','一','二','三','四','五','六'].map((label,id)=>({id,label,active:this.data.form.days.includes(id)})),allergies:['鸡蛋','大豆','麸质','乳制品','花生','坚果','鱼类','甲壳类'].map(name=>({name,active:this.data.form.allergies.includes(name)}))});},
 input(e){this.setData({['form.'+e.currentTarget.dataset.field]:e.detail.value});},
 choose(e){this.setData({['form.'+e.currentTarget.dataset.field]:e.currentTarget.dataset.value});},
 day(e){const id=Number(e.currentTarget.dataset.id),days=this.data.form.days;this.setData({'form.days':days.includes(id)?days.filter(d=>d!==id):days.concat(id)});this.options();},
 allergy(e){const name=e.currentTarget.dataset.name,a=this.data.form.allergies;this.setData({'form.allergies':a.includes(name)?a.filter(v=>v!==name):a.concat(name)});this.options();},
 vegan(e){this.setData({'form.vegan':e.detail.value});},consent(e){this.setData({consent:e.detail.value.length>0});},privacy(){ui.navigate('privacy');},
 save(){ui.run(async()=>{if(!this.data.consent)throw Error('请先阅读并同意个人信息使用说明');const p=Object.assign({},this.data.form,{age:Number(this.data.form.age),height:Number(this.data.form.height),weight:Number(this.data.form.weight),minutes:Number(this.data.form.minutes)});core.validateProfile(p);const state=store.read(),next=core.regenerate(state,p),dates=Object.keys(next.plans).filter(d=>JSON.stringify(next.plans[d])!==JSON.stringify(state.plans[d]));const result=await wx.showModal({title:'确认你的新计划',content:`${p.goal}，每周 ${p.days.length} 次，每次 ${p.minutes} 分钟。更新 ${dates.length} 天：${dates.join('、') || '无'}。已有执行记录的日期与历史记录将保留。`});if(!result.confirm)return;store.write(next);wx.switchTab({url:'/pages/today/index'});});}
});
