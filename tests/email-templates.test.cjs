const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const dir=path.join(__dirname,'../email-templates');
const subjects=JSON.parse(fs.readFileSync(path.join(dir,'SUBJECTS.json'),'utf8'));
for(const name of ['confirm-signup','reset-password','invite-user','magic-link','change-email']){
  test('branded auth template: '+name,()=>{
    const html=fs.readFileSync(path.join(dir,name+'.html'),'utf8');
    assert.match(subjects[name],/Culinary Academy/);
    assert.match(html,/<html lang="en">/);
    assert.match(html,/CULINARY ACADEMY/);
    assert.equal((html.match(/href="\{\{ \.ConfirmationURL \}\}"/g)||[]).length,1);
    assert.equal((html.match(/href=/g)||[]).length,1);
    assert.doesNotMatch(html,/<script|<img|<form|http:\/\//i);
    assert.match(html,/Never share your sign-in links or passwords/);
  });
}
