const {db,json,currentUser}=require('./_shared');
const uuid=s=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
exports.handler=async event=>{
 if(event.httpMethod!=='POST')return json(405,{error:'POST required'});
 let user;try{user=await currentUser(event)}catch{return json(401,{error:'Sign in required'})}
 try{
 if(!(await db('academy_admins?select=user_id&user_id=eq.'+encodeURIComponent(user.id))).length)return json(403,{error:'Administrator access required'});
 const x=JSON.parse(event.body||'{}');
 const reads={students:'academy_progress?select=user_id,lesson_id,completed_at&order=completed_at.desc&limit=200',courses:'lessons?select=id,title,category,description,steps,status&order=title&limit=200',assessments:'academy_questions?select=id,level,prompt,options,correct_index,position&order=level,position&limit=200',certificates:'academy_certificates?select=id,user_id,level,recipient_name,issued_at,revoked_at&order=issued_at.desc&limit=200',subscriptions:'subscriptions?select=user_id,status,current_period_end,cancel_at_period_end&limit=200',reporting:'academy_attempts?select=user_id,level,score,passed,submitted_at&order=submitted_at.desc&limit=200',audit:'academy_admin_audit?select=actor,action,target,created_at&order=created_at.desc&limit=200'};
 if(Object.hasOwn(reads,x.action))return json(200,{rows:await db(reads[x.action])});
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