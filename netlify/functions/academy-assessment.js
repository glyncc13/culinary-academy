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
 const questions=await db('academy_questions?select=id,prompt,options,correct_index&level=eq.'+level+'&order=position');
 if(!questions.length)return json(409,{error:'Assessment unavailable'});
 if(input.action==='submit'){
 const a=input.answers;
 if(!a||typeof a!=='object'||Array.isArray(a)||Object.keys(a).length!==questions.length||questions.some(q=>!Number.isInteger(a[q.id])||a[q.id]<0||a[q.id]>=q.options.length))return json(400,{error:'Answer every question'});
 const score=Math.floor(100*questions.filter(q=>a[q.id]===q.correct_index).length/questions.length);
 await db('academy_attempts',{method:'POST',body:JSON.stringify({user_id:user.id,level,score})});
 }else if(input.action!=='load')return json(400,{error:'Invalid action'});
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
 return json(200,{questions:questions.map(({id,prompt,options})=>({id,prompt,options})),attempts,eligible});
 }catch(e){return json(500,{error:'Assessment service unavailable'})}
};