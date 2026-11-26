const {db,json,currentUser,hasMfa}=require('./_shared');
const uuid=s=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
exports.handler=async event=>{
 if(event.httpMethod!=='POST')return json(405,{error:'POST required'});
 let user;try{user=await currentUser(event)}catch{return json(401,{error:'Sign in required'})}
 try{
 if(!(await db('academy_admins?select=user_id&user_id=eq.'+encodeURIComponent(user.id))).length)return json(403,{error:'Administrator access required'});
 if(!await hasMfa(event,user))return json(403,{error:'Administrator MFA required'});
 const x=JSON.parse(event.body||'{}');
 const reads={privacy:'academy_privacy_requests?select=id,user_id,kind,created_at,status&order=created_at.desc&limit=200',modules:'academy_modules?select=slug,level,title,position&order=level,position',pathways:'academy_pathways?select=level,title,description&order=level',notes:'academy_student_notes?select=user_id,note,updated_at&limit=200',students:'academy_progress?select=user_id,lesson_id,completed_at&order=completed_at.desc&limit=200',courses:'lessons?select=id,title,category,description,steps,status&order=title&limit=200',assessments:'academy_questions?select=id,level,prompt,options,correct_index,position&order=level,position&limit=200',certificates:'academy_certificates?select=id,user_id,level,recipient_name,issued_at,revoked_at&order=issued_at.desc&limit=200',subscriptions:'subscriptions?select=user_id,status,current_period_end,cancel_at_period_end&limit=200',reporting:'academy_attempts?select=user_id,level,score,passed,submitted_at&order=submitted_at.desc&limit=200',audit:'academy_admin_audit?select=actor,action,target,created_at&order=created_at.desc&limit=200'};
 if(Object.hasOwn(reads,x.action))return json(200,{rows:await db(reads[x.action])});
 const str=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
 const audit=async target=>db('academy_admin_audit',{method:'POST',body:JSON.stringify({actor:user.id,action:x.action,target})});
 const write=async(path,body,method='POST',headers={})=>db(path,{method,headers,body:JSON.stringify(body)});
 if(x.action==='studentAccounts'){
 const response=await fetch(process.env.SUPABASE_URL+'/auth/v1/admin/users?page=1&per_page=200',{headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY}});
 if(!response.ok)throw Error('User list unavailable');const data=await response.json();return json(200,{rows:data.users.map(u=>({id:u.id,email:u.email,created_at:u.created_at,email_confirmed_at:u.email_confirmed_at,last_sign_in_at:u.last_sign_in_at}))});
 }
 if(x.action==='createLesson'){
 if(!str(x.module,100)||!str(x.title,200)||typeof x.description!=='string'||x.description.length>10000||!Array.isArray(x.steps)||x.steps.length>100||x.steps.some(s=>typeof s!=='string'||s.length>4000))return json(400,{error:'Invalid lesson'});
 await audit(x.module);const id=await write('rpc/academy_admin_create_lesson',{p_module:x.module,p_title:x.title,p_description:x.description,p_steps:x.steps});return json(200,{id});
 }
 if(x.action==='createModule'){
 if(![1,2,3].includes(x.level)||!str(x.title,200)||typeof x.slug!=='string'||! /^[a-z0-9-]{1,80}$/.test(x.slug)||!Number.isInteger(x.position)||x.position<1)return json(400,{error:'Invalid module'});
 await audit(x.slug);await write('academy_modules',{slug:x.slug,level:x.level,title:x.title,position:x.position});return json(200,{ok:true});
 }
 if(x.action==='editPathway'){
 if(![1,2,3].includes(x.level)||!str(x.title,200)||!str(x.description,2000))return json(400,{error:'Invalid pathway'});
 await audit(String(x.level));await write('academy_pathways?level=eq.'+x.level,{title:x.title,description:x.description},'PATCH');return json(200,{ok:true});
 }
 if(x.action==='createQuestion'){
 if(![1,2,3].includes(x.level)||!str(x.prompt,2000)||!Array.isArray(x.options)||x.options.length!==3||x.options.some(s=>!str(s,1000))||![0,1,2].includes(x.correct_index)||!Number.isInteger(x.position)||x.position<1)return json(400,{error:'Invalid question'});
 await audit(String(x.level));await write('academy_questions',{level:x.level,prompt:x.prompt,options:x.options,correct_index:x.correct_index,position:x.position});return json(200,{ok:true});
 }
 if(x.action==='studentNote'){
 if(!uuid(x.id)||typeof x.note!=='string'||x.note.length>4000)return json(400,{error:'Invalid note'});
 await audit(x.id);await write('academy_student_notes?on_conflict=user_id',{user_id:x.id,note:x.note,updated_at:new Date().toISOString()},'POST',{Prefer:'resolution=merge-duplicates'});return json(200,{ok:true});
 }
 if(x.action==='publishLesson'){
 if(!uuid(x.id)||!['draft','published'].includes(x.status))return json(400,{error:'Invalid status'});
 await audit(x.id);await write('lessons?id=eq.'+x.id,{status:x.status},'PATCH');return json(200,{ok:true});
 }
 if(!uuid(x.id))return json(400,{error:'Invalid record identifier'});
 let path,body;
 if(x.action==='editLesson'){
 if(typeof x.title!=='string'||!x.title.trim()||x.title.length>200||typeof x.description!=='string'||x.description.length>10000||!Array.isArray(x.steps)||x.steps.length>100||x.steps.some(s=>typeof s!=='string'||s.length>4000))return json(400,{error:'Invalid lesson'});
 path='lessons?id=eq.'+x.id;body={title:x.title.trim(),description:x.description,steps:x.steps};
 }else if(x.action==='editQuestion'){
 if(typeof x.prompt!=='string'||!x.prompt.trim()||x.prompt.length>2000||!Array.isArray(x.options)||x.options.length!==3||x.options.some(s=>typeof s!=='string'||!s.trim()||s.length>1000)||![0,1,2].includes(x.correct_index))return json(400,{error:'Invalid question'});
 path='academy_questions?id=eq.'+x.id;body={prompt:x.prompt,options:x.options,correct_index:x.correct_index};
 }else if(x.action==='revokeCertificate'){path='academy_certificates?id=eq.'+x.id+'&revoked_at=is.null';body={revoked_at:new Date().toISOString()};}
 else return json(400,{error:'Unknown action'});
 await db('academy_admin_audit',{method:'POST',body:JSON.stringify({actor:user.id,action:x.action,target:x.id})});
 const rows=await db(path,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(body)});
 return rows.length?json(200,{ok:true}):json(404,{error:'Record not found or already revoked'});
 }catch(e){return json(500,{error:'Administrator service unavailable'})}
};