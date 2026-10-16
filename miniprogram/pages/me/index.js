const store=require('../../lib/store'),core=require('../../lib/core'),ui=require('../../lib/ui');
Page({data:{profile:null,status:{},busy:false},onShow(){this.refresh();},refresh(){this.setData({profile:store.read().profile,status:store.status()});},profile:ui.profile,privacy(){ui.navigate('privacy');},admin(){ui.navigate('admin');},
 async login(){if(this.data.busy)return;this.setData({busy:true});try{await store.connect();this.refresh();}catch(e){ui.toast(e.message);}finally{this.setData({busy:false});}},
 sync(){ui.run(async()=>{await store.sync();this.refresh();ui.toast(store.status().label);});},
 resolve(){ui.run(async()=>{const result=await wx.showActionSheet({itemList:['使用云端版本（替换本地）','保留本地版本（覆盖云端）']});const confirm=await wx.showModal({title:'确认解决冲突？',content:'此操作会替换所选一端的数据，请确认已保留需要的记录。'});if(confirm.confirm){await store.resolve(result.tapIndex===0);this.refresh();}});},
 content(){ui.run(async()=>{const result=await store.call('catalog');if(!result.catalog)throw Error('云端暂无已发布内容');store.update(state=>{state.catalog=result.catalog;return state;});ui.toast('内容已更新，下次生成计划时生效');});},
 clear(){ui.run(async()=>{const r=await wx.showModal({title:'删除全部执行记录？',content:'清除训练、饮食和体重记录，保留个人档案与计划。云端已连接时将同步删除。',confirmColor:'#a7432b'});if(r.confirm){store.update(state=>{state.sessions={};state.meals={};state.weights={};return state;});this.refresh();ui.toast('本机已删除，云端状态见同步提示');}});},
 remove(){ui.run(async()=>{const r=await wx.showModal({title:'注销并清除所有数据？',content:'已连接时先删除云端数据，再清除本地档案、计划和记录。此操作不能撤销。',confirmColor:'#a7432b'});if(r.confirm){await store.removeAccount();this.refresh();ui.toast('注销完成，数据已清除');}});},
 exportData(){ui.run(()=>{const fs=wx.getFileSystemManager(),filePath=wx.env.USER_DATA_PATH+'/lianshi-export.json';fs.writeFileSync(filePath,JSON.stringify(store.read(),null,2),'utf8');wx.shareFileMessage({filePath,fileName:'练食日记-个人数据.json',fail:()=>ui.toast('导出文件已生成，分享取消或当前环境不支持')});});}
});
