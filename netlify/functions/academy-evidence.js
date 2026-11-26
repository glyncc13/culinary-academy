const {db,json,currentUser,hasMfa}=require('./_shared');
const {createClient}=require('@supabase/supabase-js');
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const types=['image/jpeg','image/png','image/webp','video/mp4','video/webm'];
exports.handler=async event=>{
if(event.httpMethod!=='POST')return json(405,{error:'POST required'});
let u;try{u=await currentUser(event)}catch{return json(401,{error:'Sign in required'})}
try{
if((event.body||'').length>4000)return json(413,{error:'Request too large'});
const x=JSON.parse(event.body||'{}');
if(!uuid(x.submission_id))return json(400,{error:'Invalid submission'});
const s=(await db('academy_practical_submissions?select=id,user_id,status&id=eq.'+x.submission_id))[0];
if(!s)return json(404,{error:'Unavailable'});
const owner=s.user_id===u.id;
const assigned=!owner&&await hasMfa(event,u)&&(await db('academy_supervisor_students?select=student_id&supervisor_id=eq.'+u.id+'&student_id=eq.'+s.user_id)).length>0;
if(!owner&&!assigned)return json(403,{error:'Access denied'});
const storage=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}).storage.from('academy-evidence');
if(x.action==='reserve'&&owner&&s.status==='pending'&&types.includes(x.mime)){
const f=await db('rpc/academy_reserve_evidence',{method:'POST',body:JSON.stringify({p_user:u.id,p_submission:s.id,p_mime:x.mime})});
const {data,error}=await storage.createSignedUploadUrl(f.object_path,{upsert:false});if(error)throw error;
return json(200,{id:f.id,path:f.object_path,token:data.token});
}
if(x.action==='list'){
const rows=await db('academy_evidence_files?select=id,mime,attached&submission_id=eq.'+s.id+(owner&&s.status==='pending'?'':'&attached=eq.true'));
return json(200,{rows});
}
if(!uuid(x.id))return json(400,{error:'Invalid file'});
const f=(await db('academy_evidence_files?select=*&id=eq.'+x.id+'&submission_id=eq.'+s.id))[0];if(!f)return json(404,{error:'Unavailable'});
if(x.action==='retry'&&owner&&s.status==='pending'&&!f.attached){
const paid=await db('subscriptions?select=user_id&user_id=eq.'+u.id+'&status=in.(active,trialing)&current_period_end=gt.'+encodeURIComponent(new Date().toISOString())+'&limit=1');
if(!paid.length)return json(403,{error:'Membership required'});
const {data,error}=await storage.createSignedUploadUrl(f.object_path,{upsert:false});if(error||!data?.token)throw Error('Upload unavailable');
return json(200,{id:f.id,path:f.object_path,token:data.token});
}
if(x.action==='attach'&&owner&&s.status==='pending'){
const {data,error}=await storage.info(f.object_path);if(error||!data||!Number.isSafeInteger(data.size)||data.size<=0||data.size>52428800||data.contentType!==f.mime)throw Error('File verification failed');
await db('rpc/academy_attach_evidence',{method:'POST',body:JSON.stringify({p_user:u.id,p_file:f.id})});return json(200,{ok:true});
}
if(x.action==='view'&&f.attached){const {data,error}=await storage.createSignedUrl(f.object_path,120);if(error)throw error;return json(200,{url:data.signedUrl,mime:f.mime});}
return json(403,{error:'Operation denied'});
}catch{return json(409,{error:'Evidence operation rejected or unavailable'})}
};
