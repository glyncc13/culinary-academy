'use strict';
const {renderNotification}=require('./notifications.cjs');
// Dependency-injected worker. No network or scheduled trigger is enabled here.
// Transport must guarantee persistent idempotency for the supplied key.
async function deliverBatch({enabled,origin,claim,finish,recipient,transport,token}){
 if(enabled!==true)return {enabled:false};
 if(!transport || transport.persistentIdempotency!==true)throw Error('Approved idempotent transport required');
 const rows=await claim(token,10);
 if(!Array.isArray(rows)||rows.length>10)throw Error('Invalid batch');
 const result={sent:0,retry:0,suppressed:0,unconfirmed:0};
 for(const row of rows){
  let outcome='retry';
  try{
   const address=await recipient(row.user_id,row.kind,row.event_key);
   if(!address)outcome='suppressed';
   else{
    const message=renderNotification(row.kind,origin);
    await transport.send({...message,to:address,idempotencyKey:'academy:'+row.id});
    outcome='sent';
   }
  }catch{outcome='retry';}
  try{
   if(await finish(row.id,token,outcome)===true)result[outcome]++;
   else result.unconfirmed++;
  }catch{result.unconfirmed++;}
 }
 return result;
}
module.exports={deliverBatch};
