const {db,json}=require('./_shared');
const {createClient}=require('@supabase/supabase-js');
exports.config={schedule:'0 3 * * *'};
exports.handler=async()=>{
if(process.env.ACADEMY_ENABLE_EVIDENCE_CLEANUP!=='true')return json(200,{enabled:false});
try{
const rows=await db('rpc/academy_evidence_cleanup_candidates',{method:'POST',body:'{}'});
if(!Array.isArray(rows)||rows.length>100)throw Error('Invalid cleanup batch');
const uuid='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const pattern=new RegExp('^'+uuid+'/'+uuid+'/'+uuid+'$','i');
if(rows.some(r=>!pattern.test(r.object_path)||r.object_path.split('/')[2]!==r.id))throw Error('Invalid cleanup path');
if(!rows.length)return json(200,{cleaned:0});
const storage=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}).storage.from('academy-evidence');
const {error}=await storage.remove(rows.map(r=>r.object_path));if(error)throw error;
await db('academy_evidence_files?id=in.('+rows.map(r=>r.id).join(',')+')&attached=eq.false&cancelled_at=not.is.null&cleaned_at=is.null',{method:'PATCH',body:JSON.stringify({cleaned_at:new Date().toISOString()})});
return json(200,{cleaned:rows.length});
}catch{console.error('Evidence cleanup failed; retained reservations will be retried');return json(503,{error:'Cleanup failed'})}
};
