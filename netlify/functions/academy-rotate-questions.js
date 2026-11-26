const {db,json,currentUser,hasMfa}=require('./_shared');
exports.handler=async event=>{
 if(event.httpMethod!=='POST')return json(405,{error:'POST required'});
 let user;try{user=await currentUser(event)}catch{return json(401,{error:'Sign in required'})}
 try{
 if(!(await db('academy_admins?select=user_id&user_id=eq.'+encodeURIComponent(user.id))).length||!await hasMfa(event,user))return json(403,{error:'Administrator MFA required'});
 if((event.body||'').length>1000000)return json(413,{error:'Import too large'});
 const x=JSON.parse(event.body||'{}');
 if(x.confirm!=='REPLACE ALL QUESTIONS'||!Array.isArray(x.questions)||x.questions.length>300||x.questions.length<15)return json(400,{error:'Invalid import or confirmation'});
 const seen=new Set();const counts=[0,0,0];
 for(const q of x.questions){if(![1,2,3].includes(q.level)||typeof q.prompt!=='string'||!q.prompt.trim()||q.prompt.length>2000||!Array.isArray(q.options)||q.options.length!==3||q.options.some(s=>typeof s!=='string'||!s.trim()||s.length>1000)||new Set(q.options.map(s=>s.trim().toLowerCase())).size!==3||![0,1,2].includes(q.correct_index))return json(400,{error:'Invalid question'});const k=q.prompt.trim().toLowerCase();if(seen.has(k))return json(400,{error:'Duplicate question'});seen.add(k);counts[q.level-1]++;}
 if(counts.some(n=>n<5))return json(400,{error:'At least five questions per level required'});
 const rows=x.questions.map(q=>({level:q.level,prompt:q.prompt.trim(),options:q.options,correct_index:q.correct_index}));
 const count=await db('rpc/academy_rotate_questions',{method:'POST',body:JSON.stringify({p_actor:user.id,p_questions:rows})});
 return json(200,{count});
 }catch{return json(500,{error:'Question rotation failed'})}
};
