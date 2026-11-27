const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const all=new Set();
for(const [level,count] of [[1,17],[2,18],[3,15]]){
 test('Level '+level+' curriculum structural quality',()=>{
  const rows=JSON.parse(fs.readFileSync(path.join(__dirname,'../curriculum/level-'+level+'.json'),'utf8'));
  assert.equal(rows.length,count);
  for(const row of rows){
   assert.equal(row.level,level);
   assert.equal(row.status,'draft');
   for(const key of ['title','module','practical']) assert.ok(typeof row[key]==='string'&&row[key].trim(),key);
   for(const key of ['objectives','equipment','method','commonMistakes','knowledgeChecks']){
    assert.ok(Array.isArray(row[key])&&row[key].length>0,row.title+': '+key);
    assert.ok(row[key].every(v=>typeof v==='string'&&v.trim()),row.title+': '+key);
    assert.equal(new Set(row[key].map(v=>v.trim().toLowerCase())).size,row[key].length,row.title+': duplicate '+key);
   }
   assert.ok(row.method.length>=2,row.title);
   assert.ok(row.knowledgeChecks.length>=2,row.title);
   assert.ok(typeof row.ingredients==='string'&&row.ingredients.trim()||Array.isArray(row.ingredients)&&row.ingredients.length>0,row.title);
   const title=row.title.trim().toLowerCase();
   assert.ok(!all.has(title),title);all.add(title);
  }
 });
}
