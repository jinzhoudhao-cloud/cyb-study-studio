(function(root){
  'use strict';
  const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  function mergeResponses(base=[],local=[],remote=[],conflicts=[]) {
    const bm=new Map(base.filter(Boolean).map(x=>[x.id,x])),lm=new Map(local.filter(Boolean).map(x=>[x.id,x])),rm=new Map(remote.filter(Boolean).map(x=>[x.id,x]));
    const order=[...rm.keys(),...lm.keys()].filter((x,i,a)=>a.indexOf(x)===i);
    return order.map(id=>{
      const b=bm.get(id),l=lm.get(id),r=rm.get(id);
      if(!l)return clone(r);if(!r)return clone(l);
      const lc=!same(l,b),rc=!same(r,b);
      if(lc&&rc&&l.selected!==r.selected){conflicts.push(id);return clone(r);}
      return clone(lc&&!rc?l:r);
    });
  }
  function mergeSnapshot(base,local,remote){
    const conflicts=[];
    if(!remote?.payload)return {doc:clone(local),conflicts};
    if(!local?.payload)return {doc:clone(remote),conflicts};
    if(base&&remote.epoch!==base.epoch)return {doc:clone(remote),conflicts:['reset-on-another-device']};
    if(base&&local.epoch!==base.epoch)return {doc:clone(local),conflicts};
    if(!same(local.payload.bank,remote.payload.bank))return {doc:clone(remote),conflicts:['different-question-bank']};
    const bs=base?.payload?.state||{},ls=local.payload.state,rs=remote.payload.state;
    const out=clone(remote),s=out.payload.state,results={};
    for(const id of new Set([...Object.keys(ls.results||{}),...Object.keys(rs.results||{})])){
      const b=bs.results?.[id],l=ls.results?.[id],r=rs.results?.[id];
      if(same(l,b)){if(r)results[id]=clone(r);continue;}
      if(same(r,b)){if(l)results[id]=clone(l);continue;}
      if(!l){if(r)results[id]=clone(r);continue;}if(!r){results[id]=clone(l);continue;}
      if(l.attemptId&&r.attemptId&&l.attemptId!==r.attemptId){results[id]=clone(r);conflicts.push('different-attempt:'+id);continue;}
      results[id]={...clone(r),responses:mergeResponses(b?.responses,l.responses,r.responses,conflicts)};
    }
    s.results=results;
    const localFocusChanged=!same(ls.active,bs.active)||ls.unit!==bs.unit;
    if(localFocusChanged){s.active=clone(ls.active);s.unit=ls.unit;s.zh=ls.zh;}
    const remoteAttempt=rs.active?.unit===ls.active?.unit?rs.active?.attemptId:rs.results?.[local.payload.bank.units[ls.active?.unit]?.id]?.attemptId;
    const staleActive=!!(ls.active?.attemptId&&remoteAttempt&&remoteAttempt!==ls.active.attemptId&&remoteAttempt!==bs.active?.attemptId);
    if(staleActive){s.active=clone(rs.active);s.unit=rs.unit;conflicts.push('different-active-attempt');}
    if(s.active&&ls.active&&rs.active&&ls.active.unit===rs.active.unit&&(!ls.active.attemptId||!rs.active.attemptId||ls.active.attemptId===rs.active.attemptId)){
      const merged=mergeResponses(bs.active?.responses,ls.active.responses,rs.active.responses,conflicts),byId=new Map(merged.map(x=>[x.id,x]));
      s.active.responses=s.active.queue.map(id=>byId.get(id)||null);
      s.active.layouts=s.active.queue.map((id,i)=>byId.get(id)?.layout||s.active.layouts[i]);
    }
    const basePending=new Set(bs.pending||[]),localPending=new Set(ls.pending||[]),pending=new Set(rs.pending||[]);
    if(!staleActive){for(const id of localPending)if(!basePending.has(id))pending.add(id);for(const id of basePending)if(!localPending.has(id))pending.delete(id);}
    for(const id of conflicts){const response=rs.active?.responses?.find(x=>x?.id===id)||Object.values(rs.results||{}).flatMap(x=>x.responses||[]).find(x=>x?.id===id);if(response){if(response.correct)pending.delete(id);else pending.add(id);}}
    s.pending=[...pending];s.lastLayouts={...rs.lastLayouts,...ls.lastLayouts};
    s.lastQuestionOrders={...rs.lastQuestionOrders};
    for(const [key,value]of Object.entries(ls.lastQuestionOrders||{}))if(!same(value,bs.lastQuestionOrders?.[key])&&!staleActive)s.lastQuestionOrders[key]=clone(value);
    return {doc:out,conflicts:[...new Set(conflicts)]};
  }
  function hasWork(payload){const s=payload?.state;return !!s&&(Object.keys(s.results||{}).length>0||(s.active?.responses||[]).some(Boolean)||s.pending?.length>0);}
  root.StudySyncMerge={clone,same,mergeSnapshot,hasWork};
})(typeof window!=='undefined'?window:globalThis);
