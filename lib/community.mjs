import course from './course-bank.json' with {type:'json'};
import example from './example-bank.json' with {type:'json'};
export const reply=(body,status=200,headers={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const now=()=>Math.floor(Date.now()/1000);
export const isAdmin=(req,env)=>!!req.headers.get('oai-authenticated-user-id')&&((!!env.STUDY_ADMIN_USER_ID&&req.headers.get('oai-authenticated-user-id')===env.STUDY_ADMIN_USER_ID)||(!!env.STUDY_ADMIN_EMAIL&&req.headers.get('oai-authenticated-user-email')?.toLowerCase()===env.STUDY_ADMIN_EMAIL.toLowerCase()));
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
export function sameOrigin(req){return req.headers.get('origin')===new URL(req.url).origin;}
export async function readInput(req,max=1024){if(!sameOrigin(req))throw Object.assign(Error('origin_rejected'),{status:403});if(!req.headers.get('content-type')?.includes('application/json'))throw Object.assign(Error('json_required'),{status:415});if(+(req.headers.get('content-length')||0)>max)throw Object.assign(Error('too_large'),{status:413});const chunks=[],reader=req.body?.getReader();let bytes=0;if(reader){for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>max){await reader.cancel();throw Object.assign(Error('too_large'),{status:413});}chunks.push(value);}}const merged=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){merged.set(chunk,offset);offset+=chunk.length;}try{return JSON.parse(new TextDecoder().decode(merged));}catch{throw Object.assign(Error('invalid_json'),{status:400});}}
export async function limited(db,key,max,seconds){const t=now();const r=await db.prepare('INSERT INTO request_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<=? THEN 1 ELSE count+1 END, expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END RETURNING count').bind(key,t+seconds,t,t).first();return r.count>max;}
async function visible(db){const row=await db.prepare("SELECT value FROM site_settings WHERE key='course_visible'").first();return row?.value!=='false';}
export async function handleCommunity(req,env,route){
 const db=env.DB;if(!db)return reply({error:'storage_unavailable'},503);
 try{
  const admin=isAdmin(req,env),method=req.method,t=now();
  if(route==='config'&&method==='GET'){const uid=req.headers.get('oai-authenticated-user-id');return reply({courseVisible:await visible(db),admin,signedIn:!!uid,storageKey:uid?'study-user-'+(await hash(uid)).slice(0,24):'study-guest-v2'});}
  if(route==='course-bank'&&method==='GET'){
   if(new URL(req.url).searchParams.get('sample')==='1')return reply(example);
   if(!admin&&!await visible(db))return reply({error:'course_hidden'},404);
   return reply(course);
  }
  if(route==='admin'){
   if(!admin)return reply({error:'admin_required'},403);
   if(method==='PUT'){const input=await readInput(req);if(typeof input.courseVisible!=='boolean')return reply({error:'invalid_setting'},400);await db.prepare("INSERT INTO site_settings(key,value) VALUES ('course_visible',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(String(input.courseVisible)).run();return reply({courseVisible:input.courseVisible});}
   if(method==='DELETE'){const input=await readInput(req);if(!/^[a-f0-9]{64}$/.test(input.id||''))return reply({error:'invalid_id'},400);await db.prepare('UPDATE guest_sessions SET visible=-1 WHERE token_hash=?').bind(input.id).run();return reply({ok:true});}
   if(method==='GET')return reply({guests:(await db.prepare('SELECT token_hash AS id,nickname FROM guest_sessions WHERE visible=1 AND last_seen>? AND expires_at>? LIMIT 100').bind(t-90,t).all()).results});
  }
  if(route==='presence'){
   if(method==='GET')return reply({nicknames:(await db.prepare('SELECT nickname FROM guest_sessions WHERE visible=1 AND last_seen>? AND expires_at>? ORDER BY last_seen DESC LIMIT 50').bind(t-90,t).all()).results.map(x=>x.nickname),windowSeconds:90});
   if(!['POST','DELETE'].includes(method))return reply({error:'method_not_allowed'},405);
   const input=await readInput(req);
   const cookie=req.headers.get('cookie')?.match(/(?:^|;\s*)study_guest=([a-f0-9]{64})(?:;|$)/)?.[1];
   let token=cookie,tokenHash=token?await hash(token):null;
   let guest=tokenHash?await db.prepare('SELECT * FROM guest_sessions WHERE token_hash=? AND expires_at>?').bind(tokenHash,t).first():null;
   if(method==='DELETE'){if(guest)await db.prepare('DELETE FROM guest_sessions WHERE token_hash=?').bind(tokenHash).run();return reply({ok:true},200,{'Set-Cookie':'study_guest=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Secure'});}
   const nickname=typeof input.nickname==='string'?input.nickname.normalize('NFKC').trim():'';
   if(!/^[\p{L}\p{N} _.-]{1,24}$/u.test(nickname)||typeof input.visible!=='boolean')return reply({error:'nickname_use_1_to_24_letters_numbers'},400);
   if(guest?.visible===-1)return reply({error:'display_disabled_by_admin'},403);
   if(guest&&guest.last_seen>t-10)return reply({error:'please_wait'},429);
   if(!guest){
    const ip=req.headers.get('cf-connecting-ip')||'unknown';const bucket=await hash('guest|'+ip+'|'+Math.floor(t/3600));
    if(await limited(db,'create:'+bucket,100,3600))return reply({error:'please_wait'},429);
    await db.batch([db.prepare('DELETE FROM guest_sessions WHERE expires_at<=?').bind(t),db.prepare('DELETE FROM request_limits WHERE expires_at<=?').bind(t)]);
    const count=await db.prepare('SELECT count(*) AS n FROM guest_sessions').first();if(count.n>=5000)return reply({error:'temporarily_full'},503);
    token=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join('');tokenHash=await hash(token);
   }
   await db.prepare('INSERT INTO guest_sessions(token_hash,nickname,visible,last_seen,expires_at) VALUES (?,?,?,?,?) ON CONFLICT(token_hash) DO UPDATE SET nickname=excluded.nickname,visible=excluded.visible,last_seen=excluded.last_seen').bind(tokenHash,nickname,input.visible?1:0,t,t+86400).run();
   return reply({ok:true,nickname},200,{'Set-Cookie':`study_guest=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400${new URL(req.url).protocol==='https:'?'; Secure':''}`});
  }
  return reply({error:'method_not_allowed'},405);
 }catch(e){return reply({error:e.status?e.message:'service_unavailable'},e.status||503);}
}
