const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const html=fs.readFileSync('.sites-runtime/practice-test.html','utf8'),bank=JSON.parse(html.match(/<script id="bank" type="application\/json">([\s\S]*?)<\/script>/)[1]),code=html.match(/<script>\n([\s\S]*?)<\/script>/)[1];
function runtime(initial){let saved=initial;const nodes={};const el=id=>nodes[id]||(nodes[id]={innerHTML:'',textContent:id==='bank'?JSON.stringify(bank):'',style:{},addEventListener(){},showModal(){},close(){}});const ctx={document:{getElementById:el,querySelector:s=>el(s.replace('#','')),addEventListener(){}},localStorage:{getItem:()=>saved||null,setItem:(k,v)=>saved=v},window:{addEventListener(){}},console,confirm:()=>true,Blob,URL,setTimeout,innerWidth:1280,innerHeight:900,crypto};vm.createContext(ctx);vm.runInContext(code,ctx);return {run:s=>vm.runInContext(s,ctx),saved:()=>saved};}
const plain=x=>JSON.parse(JSON.stringify(x));const r=runtime(),run=r.run;
for(let unit=0;unit<8;unit++){
 let previous;
 for(let attempt=0;attempt<30;attempt++){
  run(`start(${unit})`);const current=plain(run('state.active'));
  assert.equal(current.queue.length,10);assert.equal(new Set(current.queue).size,10);assert.deepEqual([...current.queue].sort(),bank.units[unit].questions.map(q=>q.id).sort());
  assert(current.attemptId);if(previous){assert.notDeepEqual(current.queue,previous.queue);for(let i=0;i<10;i++){const old=previous.layouts[previous.queue.indexOf(current.queue[i])],next=current.layouts[i];assert.notDeepEqual(old.order,next.order);assert(next.order.every((id,j)=>next.colors[j]!==old.colors[old.order.indexOf(id)]));}}
  const persisted=r.saved(),reloaded=runtime(persisted);assert.equal(JSON.stringify(plain(reloaded.run('state.active'))),JSON.stringify(current));
  run('jump(4);jump(0);render()');assert.equal(JSON.stringify(plain(run('state.active.queue'))),JSON.stringify(current.queue));assert.equal(JSON.stringify(plain(run('state.active.layouts'))),JSON.stringify(current.layouts));
  previous=current;
 }
}
run('state=fresh();state.pending=["7-1","8-2","7-1"];start(0)');let active=plain(run('state.active'));assert.equal(active.queue.length,12);assert.equal(active.nativeCount,10);assert.deepEqual(active.queue.slice(10).sort(),['7-1','8-2']);assert(active.queue.slice(0,10).every(id=>bank.units[0].questions.some(q=>q.id===id)));
const firstId=active.queue[0],layout=active.layouts[0];run('choose(all[state.active.queue[0]].answer);jump(0)');assert.equal(run('state.active.responses[0].id'),firstId);assert.equal(JSON.stringify(plain(run('state.active.layouts[0]'))),JSON.stringify(layout));run('choose(all[state.active.queue[0]].options.find(o=>o.id!==all[state.active.queue[0]].answer).id)');assert.equal(run('state.active.responses.length'),1);assert(run('state.pending').includes(firstId));
while(run('!!state.active'))run('choose(all[state.active.queue[state.active.pos]].answer)');const result=plain(run('state.results["ch6-mc"]'));assert.equal(result.responses.length,12);assert.equal(result.responses.filter(x=>!x.isReview).length,10);assert.equal(result.responses.filter(x=>x.isReview).length,2);assert.equal(result.responses.filter(x=>x.correct).length,11);assert.deepEqual(result.responses.map(x=>x.id),active.queue);
run('resumeResult(0)');assert.equal(JSON.stringify(plain(run('state.active.queue'))),JSON.stringify(active.queue));assert.equal(JSON.stringify(plain(run('state.active.layouts[0]'))),JSON.stringify(layout));run('start(0)');assert.notDeepEqual(plain(run('state.active.queue.slice(0,10)')),active.queue.slice(0,10));
run('Math.random=()=>0');const deterministic1=plain(run('newQuestionOrder(["a","b","c"],"test")')),deterministic2=plain(run('newQuestionOrder(["a","b","c"],"test")'));assert.notDeepEqual(deterministic1,deterministic2);assert.deepEqual(plain(run('newQuestionOrder(["a"],"single")')),['a']);
console.log('PASS: 240 randomized attempts across 8 units; no missing/duplicate questions; different consecutive orders/options/colors; reload/back/review preserves order; new questions before unique review mistakes; answer-ID grading and summary integrity; bounded identical-RNG fallback.');
