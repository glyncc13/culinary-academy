const {db,json,currentUser}=require('./_shared');
const {randomUUID}=require('crypto');
exports.handler=async event=>{
 if(event.httpMethod!=='POST')return json(405,{error:'POST required'});
 let user;try{user=await currentUser(event)}catch{return json(401,{error:'Sign in required'})}
 try{
 const x=JSON.parse(event.body||'{}');if(typeof x.lesson_id!=='string'||! /^[0-9a-f-]{36}$/i.test(x.lesson_id))return json(400,{error:'Invalid lesson'});
 const admin=(await db('academy_admins?select=user_id&user_id=eq.'+user.id)).length>0;
 const base=process.env.SUPABASE_URL+'/storage/v1';const headers={apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json'};
 const lesson=await db('lessons?select=id,status&id=eq.'+x.lesson_id);if(!lesson.length)return json(404,{error:'Lesson unavailable'});
 const storage=async(path,body)=>{const r=await fetch(base+path,{method:'POST',headers,body:JSON.stringify(body)});if(!r.ok)throw Error('Storage request failed');return r.json()};
 if(x.action==='upload'&&admin){
 if(!['video/mp4','video/webm'].includes(x.mime))return json(400,{error:'MP4 or WebM required'});
 const path=x.lesson_id+'/'+randomUUID()+(x.mime==='video/mp4'?'.mp4':'.webm');
 const result=await storage('/object/upload/sign/academy-videos/'+path,{});return json(200,{path,url:result.url});
 }
 if(x.action==='attach'&&admin){
 if(typeof x.path!=='string'||!x.path.startsWith(x.lesson_id+'/')||! /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(mp4|webm)$/i.test(x.path))return json(400,{error:'Invalid video path'});
 await storage('/object/sign/academy-videos/'+x.path,{expiresIn:60});
 await db('academy_admin_audit',{method:'POST',body:JSON.stringify({actor:user.id,action:'attachVideo',target:x.lesson_id})});
 await db('academy_lesson_videos?on_conflict=lesson_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates'},body:JSON.stringify({lesson_id:x.lesson_id,object_path:x.path})});return json(200,{ok:true});
 }
 if(x.action!=='play')return json(403,{error:'Administrator access required'});
 const paid=await db('subscriptions?select=user_id&user_id=eq.'+user.id+'&status=in.(active,trialing)&current_period_end=gt.'+encodeURIComponent(new Date().toISOString())+'&limit=1');
 const listed=await db('academy_catalogue?select=lesson_id&lesson_id=eq.'+x.lesson_id);
 if(!admin&&(!paid.length||!listed.length||lesson[0].status!=='published'))return json(403,{error:'Active membership required'});
 const videos=await db('academy_lesson_videos?select=object_path&lesson_id=eq.'+x.lesson_id);if(!videos.length)return json(200,{url:null});
 const result=await storage('/object/sign/academy-videos/'+videos[0].object_path,{expiresIn:900});return json(200,{url:result.signedURL});
 }catch{return json(500,{error:'Video service unavailable'})}
};