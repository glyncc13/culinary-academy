const {test}=require('node:test');
const assert=require('node:assert/strict');
const {deliverBatch}=require('../email-templates/delivery-worker.cjs');
const row={id:'fixture',user_id:'student',kind:'certificate_issued',event_key:'cert'};
const base=()=>({enabled:true,origin:'https://example.test',token:'lease',claim:async()=>[row],finish:async()=>true,recipient:async()=> 'student@example.invalid',transport:{persistentIdempotency:true,send:async()=>{}}});
test('disabled worker does not access queue',async()=>assert.deepEqual(await deliverBatch({enabled:false}),{enabled:false}));
test('worker rejects non-idempotent transport',async()=>assert.rejects(deliverBatch({...base(),transport:{}})));
test('worker records confirmed delivery and stable key',async()=>{
 const options=base();let key;options.transport.send=async m=>{key=m.idempotencyKey;assert.match(m.subject,/certificate/i)};
 options.finish=async(id,token,outcome)=>{assert.equal(id,row.id);assert.equal(token,'lease');assert.equal(outcome,'sent');return true};
 assert.equal((await deliverBatch(options)).sent,1);assert.equal(key,'academy:fixture');
});
test('worker suppresses missing recipient and retries failure',async()=>{
 const a=base();a.recipient=async()=>null;a.transport.send=async()=>assert.fail('must not send');assert.equal((await deliverBatch(a)).suppressed,1);
 const b=base();b.transport.send=async()=>{throw Error('temporary')};assert.equal((await deliverBatch(b)).retry,1);
});
test('worker reports uncertain queue completion instead of claiming success',async()=>{
 const a=base();a.finish=async()=>false;assert.equal((await deliverBatch(a)).unconfirmed,1);
});
