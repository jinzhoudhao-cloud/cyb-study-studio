(async()=>{
 const load=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.body.append(s);});
 try{
  const sample=new URLSearchParams(location.search).has('sample');
  const configResponse=await fetch('/api/community/config',{cache:'no-store'});if(!configResponse.ok)throw Error('Connection unavailable / 暂时无法连接');
  const config=await configResponse.json();window.STUDY_CONFIG=config;
  window.STUDY_STORAGE=config.storageKey+(sample?'-sample':'');
  // Migrate the original owner's local records only into their own namespace.
  if(config.admin&&!sample&&!localStorage.getItem(window.STUDY_STORAGE))for(const suffix of ['','-cloud-v1','-cloud-backups-v1']){const old=localStorage.getItem('cyb-study-studio-v1'+suffix);if(old)localStorage.setItem(window.STUDY_STORAGE+suffix,old);}
  if(config.signedIn&&!sample&&!localStorage.getItem(window.STUDY_STORAGE)){
   const guest=localStorage.getItem('study-guest-v2');if(guest){try{const p=JSON.parse(guest);if((p.state?.active||Object.keys(p.state?.results||{}).length)&&confirm('Import this browser’s guest progress into your signed-in account? Choose Cancel on a shared computer if it is not yours. / 是否将此浏览器的游客进度导入当前账号？共用电脑上若非你的记录，请取消。'))localStorage.setItem(window.STUDY_STORAGE,guest);}catch{}}
  }
  const response=await fetch('/api/community/course-bank'+(sample?'?sample=1':''),{cache:'no-store'});
  if(!response.ok)throw Error(response.status===404?'This course bank is currently hidden / 课程题库暂时隐藏':'Could not load the bank / 无法加载题库，请稍后重试');
  document.getElementById('bank').textContent=JSON.stringify(await response.json());
  await load('/practice-app.js');await load('/sync-merge.js');
  if(!sample)await load('/cloud-sync.js');
  await load('/community.js');
 }catch(error){const main=document.querySelector('main');main.replaceChildren();const h=document.createElement('h1');h.textContent=error.message;const a=document.createElement('a');a.href='/';a.textContent='Back to library / 返回题库入口';main.append(h,a);}
})();
