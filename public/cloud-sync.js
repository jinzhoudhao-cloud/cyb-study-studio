(function(){
  'use strict';
  const {clone,same,mergeSnapshot,hasWork}=window.StudySyncMerge;
  const META=STORAGE+'-cloud-v1',BACKUP=STORAGE+'-cloud-backups-v1';
  let meta={base:null,epoch:crypto.randomUUID(),dirty:false},ready=false,busy=false,localRevision=0,timer=null,paused=false;
  try{meta={...meta,...JSON.parse(localStorage.getItem(META)||'{}')};}catch{}
  const originalPersist=persist,originalFresh=fresh;
  const bar=document.createElement('div');bar.id='cloud-bar';bar.innerHTML='<span id="cloud-label" role="status">Connecting to your saved progress / 正在连接云端进度…</span><div><button id="cloud-refresh">Sync now / 同步</button><a id="cloud-login" href="/signin-with-chatgpt?return_to=%2Fpractice.html" target="_top" hidden>Sign in / 登录</a><button id="cloud-backup" hidden>Restore backup / 恢复本机备份</button></div><div id="cloud-notice" role="status"></div>';
  document.querySelector('.topbar').after(bar);
  const style=document.createElement('style');style.textContent='#cloud-bar{border:1px solid #ded7f1;background:#f2eefc;border-radius:12px;padding:12px 15px;margin:-14px 0 22px;font-size:12px;color:#72618f;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}#cloud-bar button,#cloud-bar a{font-size:11px;padding:8px 10px;background:white;color:#7157bf;border-radius:7px;text-decoration:none;margin-left:5px}#cloud-notice{width:100%;font-size:11px;color:#a16d45}#cloud-notice:empty{display:none}#cloud-login[hidden],#cloud-backup[hidden]{display:none}@media(max-width:700px){#cloud-bar{margin:0 0 20px}#cloud-bar button,#cloud-bar a{min-height:36px}}';document.head.append(style);
  const label=document.getElementById('cloud-label'),notice=document.getElementById('cloud-notice'),login=document.getElementById('cloud-login'),backupButton=document.getElementById('cloud-backup');
  function status(text){label.textContent=text;}
  function saveMeta(){try{localStorage.setItem(META,JSON.stringify(meta));}catch{status('Local backup unavailable / 本机备份空间不足');}}
  function snapshot(){return {epoch:meta.epoch,payload:clone({bank,state})};}
  function backup(doc,reason){try{const list=JSON.parse(localStorage.getItem(BACKUP)||'[]');list.unshift({time:new Date().toISOString(),reason,doc:clone(doc)});localStorage.setItem(BACKUP,JSON.stringify(list.slice(0,3)));backupButton.hidden=false;}catch{notice.textContent='备份空间不足，请先导出题库和记录。';}}
  try{backupButton.hidden=!JSON.parse(localStorage.getItem(BACKUP)||'[]').length;}catch{}
  function apply(doc){if(!doc?.payload)return;validate(doc.payload.bank);bank=clone(doc.payload.bank);state=clone(doc.payload.state);meta.epoch=doc.epoch;index();originalPersist();if(!document.getElementById('review').open)render();}
  async function request(method='GET',body,since){const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),12000);try{const response=await fetch('/api/progress'+(since===undefined?'':'?version='+encodeURIComponent(since)),{method,credentials:'same-origin',cache:'no-store',signal:ctrl.signal,headers:{'X-Study-Account':window.STUDY_CONFIG.storageKey,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});if(response.status===401||response.redirected||!response.headers.get('content-type')?.includes('application/json')){login.hidden=false;paused=true;throw Error('account_changed_reload_required');}const data=await response.json();if(!response.ok&&response.status!==409)throw Error(data.error||'sync_failed');login.hidden=true;return {response,data};}finally{clearTimeout(timeout);}}
  function failure(error){status(error.message==='account_changed_reload_required'?'Account changed. Refresh to continue / 账号已变化，请刷新后继续':error.message==='sign_in_required'?'Guest · saved in this browser / 游客模式 · 进度保存在当前浏览器':'Saved on this device · retrying / 已保存在本机，等待联网同步');}
  function acceptDeletion(doc){bank=clone(DEFAULT_BANK);state=originalFresh();meta.base=clone(doc);meta.epoch=doc.epoch;meta.dirty=false;ready=true;localStorage.removeItem(BACKUP);backupButton.hidden=true;index();originalPersist();saveMeta();render();notice.textContent='Progress was deleted on another device. Old copies will not be uploaded automatically. / 进度已在其他设备删除，旧记录不会自动重新上传。';synced();}
  function synced(){status('Cloud synced / 云端已同步 · '+new Date(meta.base.updatedAt||Date.now()).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}));}
  function reportConflicts(conflicts,local){if(conflicts.length){backup(local,'concurrent-edit');notice.textContent='检测到两台设备同时修改同一记录：冲突部分保留云端版本，本机版本已备份；其他答案已合并。';}}
  async function flush(){if(!ready||paused||busy||!meta.dirty)return;busy=true;try{for(let tries=0;tries<4;tries++){
      const revision=localRevision,local=snapshot();status('Saving to cloud / 正在同步…');
      const {response,data}=await request('PUT',{version:meta.base?.version||0,epoch:local.epoch,payload:local.payload});
      if(response.status===409){if(data.deleted){acceptDeletion(data);return;}const current=snapshot(),merged=mergeSnapshot(meta.base,current,data);reportConflicts(merged.conflicts,current);meta.base=clone(data);apply(merged.doc);meta.dirty=true;saveMeta();continue;}
      meta.base=clone(data);
      if(localRevision===revision){if(!same(data.payload,local.payload))apply(data);meta.dirty=false;saveMeta();synced();return;}
      meta.dirty=true;saveMeta();
    }status('Changes queued / 更改已排队，稍后重试');
  }catch(error){failure(error);saveMeta();}finally{busy=false;if(meta.dirty&&!paused){clearTimeout(timer);timer=setTimeout(flush,4000);}}}
  persist=function(){originalPersist();if(!window.STUDY_CONFIG?.signedIn){status('Guest · saved in this browser / 游客模式 · 进度保存在当前浏览器');return;}meta.dirty=true;localRevision++;saveMeta();status('Saved locally · syncing / 已存本机，等待同步');clearTimeout(timer);timer=setTimeout(flush,300);};
  fresh=function(){if(ready){backup(snapshot(),'reset-or-import');meta.epoch=crypto.randomUUID();}return originalFresh();};
  async function pull(){if(!ready||paused||busy)return;if(meta.dirty){await flush();return;}busy=true;try{const revision=localRevision,{data}=await request('GET',undefined,meta.base?.version);if(localRevision!==revision||meta.dirty)return;if(data.unchanged){synced();return;}if(data.deleted){acceptDeletion(data);return;}if(data.payload&&data.version!==meta.base?.version){backup(snapshot(),'before-remote-update');apply(data);notice.textContent='已接收另一台设备的最新进度，可以接着做。';}meta.base=clone(data);meta.dirty=false;saveMeta();synced();}catch(error){failure(error);}finally{busy=false;if(meta.dirty){clearTimeout(timer);timer=setTimeout(flush,300);}}}
  function migration(remote){paused=true;const dialog=document.createElement('dialog');dialog.id='cloud-migration';dialog.innerHTML='<h2 style="font-size:21px">发现两份已有进度</h2><p style="color:#81778d">云端和这台设备都保存了做题记录。本机旧记录会先备份，你可以选择：</p><div class="actions"><button class="primary" id="use-cloud">Continue cloud / 使用云端进度</button><button class="secondary" id="merge-local">Merge this device / 合并本机记录</button></div><p style="font-size:12px;color:#999">合并时，冲突的同一题以云端为准；未冲突的已完成单元会保留。</p>';document.body.append(dialog);dialog.addEventListener('cancel',e=>e.preventDefault());dialog.showModal();const local=snapshot();backup(local,'legacy-device-progress');
    function done(merge){const result=merge?mergeSnapshot(null,local,remote):{doc:remote,conflicts:[]};meta.base=clone(remote);apply(result.doc);meta.dirty=merge;paused=false;ready=true;dialog.close();dialog.remove();saveMeta();if(merge){reportConflicts(result.conflicts,local);flush();}else synced();}
    document.getElementById('use-cloud').onclick=()=>done(false);document.getElementById('merge-local').onclick=()=>done(true);
  }
  async function initialize(){try{const {data}=await request(),local=snapshot();
    if(data.deleted){acceptDeletion(data);return;}
    if(!data.payload){meta.base=data;meta.dirty=true;ready=true;saveMeta();await flush();return;}
    if(meta.base){if(meta.dirty){const merged=mergeSnapshot(meta.base,local,data);reportConflicts(merged.conflicts,local);meta.base=clone(data);apply(merged.doc);meta.dirty=true;ready=true;saveMeta();await flush();}else{apply(data);meta.base=clone(data);ready=true;meta.dirty=false;saveMeta();synced();}return;}
    if(hasWork(local.payload)&&hasWork(data.payload)&&!same(local.payload,data.payload)){migration(data);return;}
    if(hasWork(local.payload)&&!hasWork(data.payload)){meta.base=clone(data);meta.dirty=true;ready=true;saveMeta();await flush();return;}
    apply(data);meta.base=clone(data);meta.dirty=false;ready=true;saveMeta();synced();
  }catch(error){failure(error);setTimeout(initialize,10000);}}
  document.getElementById('cloud-refresh').onclick=()=>ready?(meta.dirty?flush():pull()):initialize();
  backupButton.onclick=()=>{let list;try{list=JSON.parse(localStorage.getItem(BACKUP)||'[]');}catch{return;}if(!list.length)return;if(!confirm('Restore the latest device backup and sync it to the account? This replaces the current progress. / 恢复最近的本机备份，并同步替换当前账号进度？'))return;const doc=list[0].doc;backup(snapshot(),'before-manual-restore');apply({...doc,epoch:crypto.randomUUID()});persist();};
  addEventListener('online',()=>ready?flush():initialize());addEventListener('focus',()=>{if(ready)pull();});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')pull();else flush();});setInterval(()=>{if(document.visibilityState==='visible')pull();},15000);
  window.StudyCloudSync={flush,pull,getMeta:()=>clone(meta),async erase(){if(busy)throw Error('Sync in progress. Please retry shortly / 正在同步，请稍后再试');paused=true;clearTimeout(timer);const response=await fetch('/api/progress',{method:'DELETE',headers:{'Content-Type':'application/json','X-Study-Account':window.STUDY_CONFIG.storageKey},body:'{}'});if(!response.ok){paused=false;throw Error('Could not delete cloud records / 云端记录未能删除');}for(const key of [STORAGE,META,BACKUP])localStorage.removeItem(key);location.href='/';}};
  if(window.STUDY_CONFIG?.signedIn)initialize();else{status('Guest · saved in this browser / 游客模式 · 进度保存在当前浏览器');login.hidden=false;}
})();
