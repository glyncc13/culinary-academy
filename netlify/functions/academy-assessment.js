const {db,json,currentUser}=require('./_shared');
exports.handler=async event=>{
 if(event.httpMethod!=='POST')return json(405,{error:'POST required'});
 let user;try{user=await currentUser(event)}catch{return json(401,{error:'Sign in required'})}
 try{
 const input=JSON.parse(event.body||'{}');const level=input.level;
 if(![1,2,3].includes(level))return json(400,{error:'Invalid level'});
 const uid=encodeURIComponent(user.id);
 const active=await db('subscriptions?select=user_id&user_id=eq.'+uid+'&status=in.(active,trialing)&current_period_end=gt.'+encodeURIComponent(new Date().toISOString())+'&limit=1');
 if(!active.length)return json(403,{error:'Active membership required'});
 let questions,runId;
 if(input.action==='submit'){
 if(typeof input.runId!=='string'||! /^[0-9a-f-]{36}$/i.test(input.runId))return json(400,{error:'Invalid assessment session'});
 const runs=await db('academy_assessment_runs?select=id,level&id=eq.'+input.runId+'&user_id=eq.'+uid);
 if(!runs.length||runs[0].level!==level)return json(400,{error:'Invalid assessment session'});
 await db('rpc/academy_grade_run',{method:'POST',body:JSON.stringify({p_user:user.id,p_run:input.runId,p_answers:input.answers})});
 }else if(input.action!=='load')return json(400,{error:'Invalid action'});
 questions=await db('academy_questions?select=id,prompt,options,correct_index&level=eq.'+level+'&order=position');
 if(!questions.length)return json(409,{error:'Assessment unavailable'});
 const recent=await db('academy_assessment_runs?select=id&user_id=eq.'+uid+'&created_at=gt.'+encodeURIComponent(new Date(Date.now()-3600000).toISOString())+'&limit=30');
 if(recent.length>=30)return json(429,{error:'Assessment limit reached; try again later'});
 const rows=await db('academy_assessment_runs',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({user_id:user.id,level,snapshot:questions})});runId=rows[0].id;
 const attempts=await db('academy_attempts?select=id,score,passed,submitted_at&user_id=eq.'+uid+'&level=eq.'+level+'&order=submitted_at.desc&limit=100');
 const passed=await db('academy_attempts?select=id&user_id=eq.'+uid+'&level=eq.'+level+'&passed=eq.true&limit=1');
 const modules=await db('academy_modules?select=slug&level=eq.'+level);
 const links=await db('academy_module_lessons?select=module_slug,lesson_id');
 const catalogue=await db('academy_catalogue?select=lesson_id');
 const published=await db('lessons?select=id&status=eq.published');
 const available=new Set(catalogue.map(x=>x.lesson_id).filter(id=>published.some(p=>p.id===id)));
 const required=links.filter(x=>modules.some(m=>m.slug===x.module_slug)&&available.has(x.lesson_id));
 const progress=await db('academy_progress?select=lesson_id&user_id=eq.'+uid);
 const eligible=modules.length>0&&modules.every(m=>required.some(x=>x.module_slug===m.slug))&&required.every(x=>progress.some(p=>p.lesson_id===x.lesson_id))&&passed.length>0;
 return json(200,{runId,questions:questions.map(({id,prompt,options})=>({id,prompt,options})),attempts,eligible});
 }catch(e){return json(500,{error:'Assessment service unavailable'})}
};