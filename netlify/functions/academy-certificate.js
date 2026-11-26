const {db,json,currentUser,site}=require('./_shared');
const titles=['','Foundation','Professional Cookery','Advanced Cookery'];
function pdf(c){
 const esc=s=>String(s).replace(/[^\x20-\x7e]/g,'?').replace(/[\\()]/g,'\\$&');
 const line=(s,y,size)=>{const x=Math.max(35,(842-s.length*size*.52)/2);return 'BT /F1 '+size+' Tf '+x+' '+y+' Td ('+esc(s)+') Tj ET\n'};
 const stream='0.98 0.97 0.93 rg 0 0 842 595 re f\n0.65 0.52 0.27 RG 3 w 25 25 792 545 re S\n0.14 0.29 0.22 rg\n'+line('CULINARY ACADEMY - TEST EDITION',490,24)+line('Certificate of Completion',425,34)+line('Presented to',360,17)+line(c.recipient_name,310,Math.min(30,1400/c.recipient_name.length))+line('Level '+c.level+' - '+titles[c.level],250,25)+line('Completed required lessons and passed the assessment',210,15)+line('Issued: '+c.issued_at.slice(0,10),165,14)+line('Certificate: '+c.id,130,12)+line(site()+'/?verify='+c.id,95,10)+line('Internal learning achievement - not an accredited qualification.',55,12);
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Length '+Buffer.byteLength(stream)+' >>\nstream\n'+stream+'endstream'];
 let out='%PDF-1.4\n',offsets=[0];objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(out));out+=(i+1)+' 0 obj\n'+o+'\nendobj\n'});const x=Buffer.byteLength(out);out+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+x+'\n%%EOF\n';return Buffer.from(out);
}
exports.handler=async event=>{
 try{
 if(event.httpMethod==='GET'){
 const id=event.queryStringParameters?.id||'';if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return json(400,{error:'Invalid certificate number'});
 const rows=await db('academy_certificates?select=id,level,issued_at,revoked_at&id=eq.'+id);const c=rows[0];return json(200,c?{valid:!c.revoked_at,id:c.id,level:c.level,issued_at:c.issued_at,test:true}:{valid:false});
 }
 if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
 let user;try{user=await currentUser(event)}catch{return json(401,{error:'Sign in required'})}
 if(!user?.id)return json(401,{error:'Sign in required'});
 if((event.body||'').length>4096)return json(413,{error:'Request too large'});
 let input;try{input=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Invalid request'})}
 if(!input||typeof input!=='object'||Array.isArray(input))return json(400,{error:'Invalid request'});
 const level=input.level;if(![1,2,3].includes(level))return json(400,{error:'Invalid level'});
 const uid=encodeURIComponent(user.id),path='academy_certificates?user_id=eq.'+uid+'&level=eq.'+level;
 let c=(await db(path))[0];
 if(!c){
 const name=typeof input.name==='string'?input.name.trim():'';
 if(!/^[A-Za-z][A-Za-z .'-]{1,79}$/.test(name)||input.consent!==true)return json(400,{error:'Enter a certificate name using Latin letters and confirm issuance'});
 const active=await db('subscriptions?select=user_id&user_id=eq.'+uid+'&status=in.(active,trialing)&current_period_end=gt.'+encodeURIComponent(new Date().toISOString())+'&limit=1');
 if(!active.length)return json(403,{error:'Active membership required to issue a certificate'});
 const [passed,modules,links,catalogue,published,progress]=await Promise.all([db('academy_attempts?select=id&user_id=eq.'+uid+'&level=eq.'+level+'&passed=eq.true&limit=1'),db('academy_modules?select=slug&level=eq.'+level),db('academy_module_lessons?select=module_slug,lesson_id'),db('academy_catalogue?select=lesson_id'),db('lessons?select=id&status=eq.published'),db('academy_progress?select=lesson_id&user_id=eq.'+uid)]);
 const available=new Set(catalogue.map(x=>x.lesson_id).filter(id=>published.some(p=>p.id===id)));const required=links.filter(x=>modules.some(m=>m.slug===x.module_slug)&&available.has(x.lesson_id));
 if(!passed.length||!modules.length||!modules.every(m=>required.some(x=>x.module_slug===m.slug))||!required.every(x=>progress.some(p=>p.lesson_id===x.lesson_id)))return json(403,{error:'Complete all required lessons and pass the assessment first'});
 if(await db('rpc/academy_practical_eligible',{method:'POST',body:JSON.stringify({p_user:user.id,p_level:level})})!==true)return json(403,{error:'Complete a competent practical assignment in every module first'});
 await db('academy_certificates?on_conflict=user_id,level',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates'},body:JSON.stringify({user_id:user.id,level,recipient_name:name})});c=(await db(path))[0];
 }
 if(!c||c.revoked_at)return json(403,{error:'Certificate unavailable'});
 return {statusCode:200,headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="CA-'+c.id+'.pdf"','Cache-Control':'no-store'},isBase64Encoded:true,body:pdf(c).toString('base64')};
 }catch(e){return json(500,{error:'Certificate service unavailable'})}
};