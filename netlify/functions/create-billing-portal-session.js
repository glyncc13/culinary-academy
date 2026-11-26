const {stripe,db,json,currentUser,site}=require('./_shared');
exports.handler=async(event)=>{
 if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
 try {
  const user=await currentUser(event);
  const rows=await db(`billing_customers?user_id=eq.${encodeURIComponent(user.id)}&select=stripe_customer_id`);
  if(!rows?.length)return json(404,{error:'No billing account found'});
  const session=await stripe.billingPortal.sessions.create({customer:rows[0].stripe_customer_id,return_url:`${site()}/membership.html`});
  return json(200,{url:session.url});
 }catch(e){console.error('Portal error',e);return json(400,{error:'Unable to open billing portal.'});}
};
