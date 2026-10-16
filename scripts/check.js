const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve(__dirname,'..'),mini=path.join(root,'miniprogram');
let count=0;
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.name==='node_modules'||e.name==='.git'?[]:e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
for(const file of walk(root)){
  if(file.endsWith('.json')){JSON.parse(fs.readFileSync(file,'utf8'));count++;}
  if(file.endsWith('.js')){cp.execFileSync(process.execPath,['--check',file],{stdio:'pipe'});count++;}
}
const app=JSON.parse(fs.readFileSync(path.join(mini,'app.json'),'utf8'));
for(const page of app.pages){
  for(const ext of ['js','json','wxml','wxss'])if(!fs.existsSync(path.join(mini,page+'.'+ext)))throw Error('Missing page file: '+page+'.'+ext);
  const xml=fs.readFileSync(path.join(mini,page+'.wxml'),'utf8'),stack=[];
  const tokens=xml.match(/<(?:[^>"']|"[^"]*"|'[^']*')+>/g)||[];
  for(const token of tokens){if(token.startsWith('<!--'))continue;const tag=token.match(/^<\/?([\w-]+)/)[1];if(token.startsWith('</')){if(stack.pop()!==tag)throw Error('Unbalanced WXML '+page+': '+tag);}else if(!token.endsWith('/>'))stack.push(tag);}
  if(stack.length)throw Error('Unclosed WXML in '+page+': '+stack);
  let definition;global.Page=options=>{definition=options;};require(path.join(mini,page+'.js'));delete global.Page;
  for(const match of xml.matchAll(/(?:bind|catch)(?::)?[a-z]+="([a-zA-Z]\w*)"/g))if(typeof definition[match[1]]!=='function')throw Error('Missing handler '+page+' '+match[1]);
  count++;
}
for(const tab of app.tabBar.list)if(!app.pages.includes(tab.pagePath))throw Error('Invalid tab: '+tab.pagePath);
const catalog=require('../miniprogram/lib/catalog');
for(const exercise of catalog.exercises)if(!fs.existsSync(path.join(mini,exercise.image)))throw Error('Missing exercise image '+exercise.image);
console.log('PASS: '+count+' JS/JSON/page checks; routes, handlers, WXML balance and assets verified.');
