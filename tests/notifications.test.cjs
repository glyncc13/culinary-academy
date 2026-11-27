const {test}=require('node:test');
const assert=require('node:assert/strict');
const {renderNotification}=require('../email-templates/notifications.cjs');
for(const kind of ['membership_active','membership_cancelled','payment_failed','practical_reviewed','certificate_issued']){
 test('notification: '+kind,()=>{
  const message=renderNotification(kind,'https://example.test');
  assert.match(message.subject,/^Culinary Academy \| /);
  assert.match(message.text,/https:\/\/example.test\/membership.html/);
  assert.match(message.html,/href="https:\/\/example.test\/membership.html"/);
  assert.doesNotMatch(message.html,/<script|<img|<form/i);
 });
}
test('notification rejects unknown events and invalid origins',()=>{
 assert.throws(()=>renderNotification('toString','https://example.test'));
 for(const origin of ['http://example.test','https://user@example.test','https://example.test/path','https://example.test/?x=y','https://example.test/#x']) assert.throws(()=>renderNotification('payment_failed',origin));
});
