import {limited,readInput} from './community.mjs';
const json = (body, status = 200) => Response.json(body, {status, headers: {'Cache-Control':'no-store', 'Vary':'Cookie', 'X-Content-Type-Options':'nosniff'}});
function validPayload(p) {
  if (!p || !p.bank || !p.state || typeof p.bank.id !== 'string' || !Array.isArray(p.bank.units) || !p.bank.units.length) return false;
  const ids = new Set();
  for (const unit of p.bank.units) {
    if (!Array.isArray(unit.questions) || !unit.questions.length) return false;
    for (const q of unit.questions) {
      if (!q.id || ids.has(q.id) || typeof q.en !== 'string' || typeof q.zh !== 'string' || !Array.isArray(q.options) || !q.options.some(o=>o.id===q.answer)) return false;
      ids.add(q.id);
    }
  }
  const s=p.state;
  if (!Number.isInteger(s.unit) || s.unit<0 || s.unit>=p.bank.units.length || !Array.isArray(s.pending) || s.pending.some(id=>!ids.has(id)) || !s.results || typeof s.results!=='object' || Array.isArray(s.results)) return false;
  if (s.active && (!Array.isArray(s.active.queue) || s.active.queue.some(id=>!ids.has(id)) || !Number.isInteger(s.active.pos) || s.active.pos<0 || s.active.pos>s.active.queue.length || !Array.isArray(s.active.responses) || !Array.isArray(s.active.layouts))) return false;
  return true;
}
async function read(db, userId) {
  const row=await db.prepare('SELECT payload, epoch, version, updated_at FROM study_progress WHERE user_id = ?').bind(userId).first();
  return row ? {payload:JSON.parse(row.payload),...(row.payload==='null'?{deleted:true}:{}),epoch:row.epoch,version:row.version,updatedAt:row.updated_at} : {payload:null,epoch:null,version:0,updatedAt:null};
}
export async function handleProgress(request, db) {
  const uid=request.headers.get('oai-authenticated-user-id');
  if (!uid) return json({error:'sign_in_required'},401);
  if (!db) return json({error:'storage_unavailable'},503);
  try {
    const expected=request.headers.get('X-Study-Account');
    if(expected){const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(uid)))).map(x=>x.toString(16).padStart(2,'0')).join('');if(expected!=='study-user-'+digest.slice(0,24))return json({error:'account_changed_reload_required'},401);}
    if (request.method==='GET') {
      const doc=await read(db,uid),since=new URL(request.url).searchParams.get('version');
      return json(since!==null&&String(doc.version)===since?{unchanged:true,version:doc.version,updatedAt:doc.updatedAt}:doc);
    }
    if (request.method==='DELETE') {
      if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'origin_rejected'},403);
      await db.prepare("INSERT INTO study_progress(user_id,payload,epoch,version,updated_at) VALUES (?,'null',?,1,?) ON CONFLICT(user_id) DO UPDATE SET payload='null',epoch=excluded.epoch,version=version+1,updated_at=excluded.updated_at").bind(uid,crypto.randomUUID(),new Date().toISOString()).run();return json({ok:true});
    }
    if (request.method!=='PUT') return json({error:'method_not_allowed'},405);
    if(await limited(db,'progress:'+uid,90,60))return json({error:'please_wait'},429);
    const origin=request.headers.get('origin');
    if (origin && origin!==new URL(request.url).origin) return json({error:'origin_rejected'},403);
    if (!request.headers.get('content-type')?.includes('application/json')) return json({error:'json_required'},415);
    if (+(request.headers.get('content-length')||0)>2_000_000) return json({error:'too_large'},413);
    const input=await readInput(request,2_000_000);
    if (!Number.isInteger(input.version)||input.version<0||typeof input.epoch!=='string'||input.epoch.length>100||!input.epoch||!validPayload(input.payload))return json({error:'invalid_progress'},400);
    const now=new Date().toISOString(),payload=JSON.stringify(input.payload);
    const result=input.version===0
      ? await db.prepare('INSERT INTO study_progress (user_id, payload, epoch, version, updated_at) VALUES (?, ?, ?, 1, ?) ON CONFLICT(user_id) DO NOTHING').bind(uid,payload,input.epoch,now).run()
      : await db.prepare("UPDATE study_progress SET payload = ?, epoch = ?, version = version + 1, updated_at = ? WHERE user_id = ? AND version = ? AND (payload!='null' OR epoch=?)").bind(payload,input.epoch,now,uid,input.version,input.epoch).run();
    if(!result.meta.changes)return json({error:'version_conflict',...await read(db,uid)},409);
    return json(await read(db,uid));
  } catch(e) { return json({error:e.status?e.message:'storage_error'},e.status||503); }
}
export async function handleStorageHealth(db) {
  if(!db)return json({ready:false},503);
  try{await db.prepare('SELECT version FROM study_progress LIMIT 0').all();return json({ready:true,storage:'connected'});}catch{return json({ready:false},503);}
}
