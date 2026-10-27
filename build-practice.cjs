const fs=require('node:fs');let html=fs.readFileSync('practice-base.html','utf8');
const startAt=html.indexOf('function start(n){'),endAt=html.indexOf('\nfunction wordText(',startAt);
if(startAt<0||endAt<0)throw Error('Start function not found');
html=html.slice(0,startAt)+`function newQuestionOrder(ids,key,previous){state.lastQuestionOrders=state.lastQuestionOrders||{};const last=state.lastQuestionOrders[key]||previous||[];let order=shuffle(ids),tries=0;while(order.length>1&&order.length===last.length&&order.every((id,i)=>id===last[i])&&tries++<24)order=shuffle(ids);if(order.length>1&&order.length===last.length&&order.every((id,i)=>id===last[i]))order.push(order.shift());state.lastQuestionOrders[key]=[...order];return order;}
function start(n){const u=bank.units[n],old=state.active,prior=state.results[u.id],previous=old?.unit===n?old.queue.slice(0,old.nativeCount):prior?.responses.filter(x=>!x.isReview).map(x=>x.id);const native=newQuestionOrder(u.questions.map(q=>q.id),bank.id+'|'+u.id+'|native',previous);const pending=[...new Set(state.pending.filter(id=>all[id]&&!native.includes(id)))];const review=newQuestionOrder(pending,bank.id+'|'+u.id+'|review',old?.unit===n?old.queue.slice(old.nativeCount):null);const queue=[...native,...review];state.unit=n;state.zh=false;state.active={unit:n,queue,attemptId:crypto.randomUUID(),nativeCount:native.length,pos:0,responses:[],layouts:queue.map(id=>newLayout(all[id]))};persist();render();}
`+html.slice(endAt);
html=html.replace('const ids=[...state.pending];','const ids=newQuestionOrder([...new Set(state.pending)],bank.id+\'|mistakes-only\',state.active?.practiceOnly?state.active.queue:null);');
html=html.replace('pending:[],lastLayouts:{},zh:false','pending:[],lastLayouts:{},lastQuestionOrders:{},zh:false');
html=html.replace(' · Choose to continue. Tap a question number to revisit. 选答后自动前进，点题号可回看和改选。',' · Shuffled on each retry / 每次重做随机出题 · 点题号可回看和改选。');
html=html.replace('queue,nativeCount:native.length,pos:0','queue,attemptId:crypto.randomUUID(),nativeCount:native.length,pos:0');
html=html.replace('unit:a.unit,responses:a.responses,finished:', 'unit:a.unit,attemptId:a.attemptId,responses:a.responses,finished:');
html=html.replace('unit:r.unit,queue:r.responses.map', 'unit:r.unit,attemptId:r.attemptId,queue:r.responses.map');
html=html.replace('unit:a.unit,responses:a.responses.map', 'unit:a.unit,attemptId:a.attemptId,responses:a.responses.map');
html=html.replace('queue:ids,nativeCount:0','queue:ids,attemptId:crypto.randomUUID(),nativeCount:0');
html=html.replace('</body>','<script src="/sync-merge.js"></script><script src="/cloud-sync.js"></script></body>');
fs.mkdirSync('public',{recursive:true});
// Keep the test fixture local. Production HTML never embeds the course bank.
fs.mkdirSync('.sites-runtime',{recursive:true});fs.writeFileSync('.sites-runtime/practice-test.html',html);
const bankMatch=html.match(/<script id="bank" type="application\/json">([\s\S]*?)<\/script>/);
fs.writeFileSync('lib/course-bank.json',bankMatch[1]);
html=html.replace(bankMatch[0],'<script id="bank" type="application/json">{}</script>');
const appMatch=html.match(/<script>\n([\s\S]*?)<\/script>/);
let appCode=appMatch[1];
appCode=appCode.replace("const STORAGE='cyb-study-studio-v1'", "const STORAGE=window.STUDY_STORAGE");
html=html.replace(appMatch[0],'<script src="/practice-loader.js"></script>');
html=html.replace('<script src="/sync-merge.js"></script><script src="/cloud-sync.js"></script>','');
fs.writeFileSync('public/practice-app.js',appCode);fs.writeFileSync('public/practice.html',html);
console.log('Prepared gated course bank and public practice shell');
