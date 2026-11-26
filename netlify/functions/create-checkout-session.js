const {stripe,db,json,currentUser,site}=require('./_shared');
exports.handler=async(event)=>{
 if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
 try {
  const user=await currentUser(event);
  const rows=await db(`billing_customers?user_id=eq.${encodeURIComponent(user.id)}&select=stripe_customer_id`);
  let customerId=rows?.[0]?.stripe_customer_id;
  if(!customerId){
   const customer=await stripe.customers.create({email:user.email,metadata:{supabase_user_id:user.id}});
   customerId=customer.id;
   await db('billing_customers?on_conflict=user_id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates'},body:JSON.stringify({user_id:user.id,stripe_customer_id:customerId})});
   const saved=await db(`billing_customers?user_id=eq.${encodeURIComponent(user.id)}&select=stripe_customer_id`);
   customerId=saved[0].stripe_customer_id;
  }
  const existing=await stripe.subscriptions.list({customer:customerId,status:'all',limit:100});if(existing.has_more||existing.data.some(s=>['active','trialing','past_due','unpaid','incomplete','paused'].includes(s.status)))return json(409,{error:'Existing subscription; use billing portal.'});
  const session=await stripe.checkout.sessions.create({mode:'subscription',customer:customerId,line_items:[{price:process.env.STRIPE_MONTHLY_PRICE_ID,quantity:1}],client_reference_id:user.id,subscription_data:{metadata:{supabase_user_id:user.id}},success_url:`${site()}/membership.html?billing=success`,cancel_url:`${site()}/membership.html?billing=cancelled`});
  return json(200,{url:session.url});
 }catch(e){console.error('Checkout error',e);return json(400,{error:'Unable to start checkout. Check configuration and sign-in.'});}
};
