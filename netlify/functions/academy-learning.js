const {db,json,currentUser,hasMfa}=require('./_shared');
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const bank=[...require('../../curriculum/level-1.json'),...require('../../curriculum/level-2.json'),...require('../../curriculum/level-3.json')];
exports.handler=async event=>{
 if(event.httpMethod!=='POST')return json(405,{error:'POST required'});
 let u;try{u=await currentUser(event)}catch{return json(401,{error:'Sign in required'})}
 try{
 if((event.body||'').length>20000)return json(413,{error:'Request too large'});
 const x=JSON.parse(event.body||'{}');
 const rpc=(name,args)=>db('rpc/'+name,{method:'POST',body:JSON.stringify(args)});
 if(['supervisorQueue','mark','supervisorStatus'].includes(x.action)){
 if(!await hasMfa(event,u)||!(await db('academy_supervisors?select=user_id&user_id=eq.'+u.id)).length)return json(403,{error:'Supervisor MFA required'});
 if(x.action==='supervisorStatus')return json(200,{ok:true});
 if(x.action==='supervisorQueue'){
 const assignments=await db('academy_supervisor_students?select=student_id&supervisor_id=eq.'+u.id+'&limit=100');
 const ids=assignments.map(a=>a.student_id).filter(uuid);
 return json(200,{rows:ids.length?await db('academy_practical_submissions?select=*&status=eq.pending&user_id=in.('+ids.join(',')+')&limit=100'):[]});
 }
 if(!uuid(x.id)||!x.rubric||typeof x.feedback!=='string')return json(400,{error:'Invalid rubric'});
 return json(200,{competent:await rpc('academy_mark_practical',{p_actor:u.id,p_id:x.id,p_rubric:x.rubric,p_feedback:x.feedback.trim()})});
 }
 if(['preview','import','queue','review','drafts','approve','allocate'].includes(x.action)){
 if(!(await db('academy_admins?select=user_id&user_id=eq.'+u.id)).length||!await hasMfa(event,u))return json(403,{error:'Administrator MFA required'});
 if(x.action==='allocate'){
 if(!uuid(x.supervisor_id)||!uuid(x.student_id)||x.supervisor_id===x.student_id||x.confirm!=='ALLOCATE')return json(400,{error:'Invalid allocation'});
 return json(200,{ok:await rpc('academy_allocate_supervisor',{p_actor:u.id,p_supervisor:x.supervisor_id,p_student:x.student_id})});
 }
 if(x.action==='preview'||x.action==='import'){
 if(x.action==='import'&&x.confirm!=='IMPORT DRAFT CURRICULUM')return json(400,{error:'Confirmation required'});
 return json(200,{rows:await rpc('academy_import_curriculum',{p_actor:u.id,p_rows:bank,p_preview:x.action==='preview'})});
 }
 if(x.action==='drafts')return json(200,{rows:await db('academy_curriculum_drafts?select=lesson_id,content,approved&limit=100')});
 if(x.action==='approve'&&uuid(x.lesson_id)&&x.confirm==='REVIEWED')return json(200,{ok:await rpc('academy_approve_curriculum',{p_actor:u.id,p_lesson:x.lesson_id})});
 if(x.action==='review')return json(403,{error:'Use assigned supervisor rubric'});
 if(x.action==='queue')return json(200,{rows:await db('academy_practical_submissions?select=*&status=eq.pending&order=created_at.asc&limit=100')});
 if(!uuid(x.id)||!['competent','revise'].includes(x.status)||typeof x.feedback!=='string'||!x.feedback.trim()||x.feedback.length>4000)return json(400,{error:'Invalid review'});
 return json(200,{ok:await rpc('academy_review_practical',{p_actor:u.id,p_id:x.id,p_status:x.status,p_feedback:x.feedback.trim()})});
 }
 if(x.action==='content'&&uuid(x.lesson_id)){
 const paid=await db('subscriptions?select=user_id&user_id=eq.'+u.id+'&status=in.(active,trialing)&current_period_end=gt.'+encodeURIComponent(new Date().toISOString())+'&limit=1');
 if(!paid.length)return json(403,{error:'Membership required'});
 const visible=await db('lessons?select=id,academy_catalogue!inner(lesson_id)&id=eq.'+x.lesson_id+'&status=eq.published');
 if(!visible.length)return json(404,{error:'Lesson unavailable'});
 const rows=await db('academy_curriculum_drafts?select=content&approved=eq.true&lesson_id=eq.'+x.lesson_id);
 return json(200,{content:rows[0]?.content||null});
 }
 if(x.action==='mine')return json(200,{rows:await db('academy_practical_submissions?select=*&user_id=eq.'+u.id+'&order=created_at.desc&limit=100')});
 if(x.action==='submit'&&uuid(x.lesson_id)&&typeof x.evidence==='string'&&x.evidence.trim().length>=20&&x.evidence.length<=4000)return json(200,{id:await rpc('academy_submit_practical',{p_user:u.id,p_lesson:x.lesson_id,p_evidence:x.evidence.trim()})});
 return json(400,{error:'Invalid request'});
 }catch{return json(409,{error:'Learning operation unavailable or rejected'})}
};
