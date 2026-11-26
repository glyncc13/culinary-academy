const {stripe,db,json}=require('./_shared');
async function syncSubscription(subscription){
 const customerId=typeof subscription.customer==='string'?subscription.customer:subscription.customer.id;
 const customers=await db(`billing_customers?stripe_customer_id=eq.${encodeURIComponent(customerId)}&select=user_id`);
 const userId=customers?.[0]?.user_id;
 if(!userId)return;
 const item=subscription.items.data.find(i=>i.price.id===process.env.STRIPE_MONTHLY_PRICE_ID); if(!item)return;
 await db('subscriptions?on_conflict=stripe_subscription_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates'},body:JSON.stringify({stripe_subscription_id:subscription.id,user_id:userId,stripe_customer_id:customerId,stripe_price_id:item?.price?.id||null,status:subscription.status,current_period_end:(item.current_period_end||subscription.current_period_end)?new Date((item.current_period_end||subscription.current_period_end)*1000).toISOString():null,cancel_at_period_end:subscription.cancel_at_period_end,updated_at:new Date().toISOString()})});
}
exports.handler=async(event)=>{
 if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
 let stripeEvent;
 try{
  const sig=event.headers['stripe-signature']||event.headers['Stripe-Signature'];
  const raw=event.isBase64Encoded?Buffer.from(event.body,'base64'):event.body;
  stripeEvent=stripe.webhooks.constructEvent(raw,sig,process.env.STRIPE_WEBHOOK_SECRET);
 }catch(e){return json(400,{error:'Invalid webhook signature'});}
 try{
  if(stripeEvent.livemode)return json(400,{error:'Live events forbidden'});
  const found=await db(`stripe_webhook_events?stripe_event_id=eq.${encodeURIComponent(stripeEvent.id)}&select=stripe_event_id`);
  if(found.length)return json(200,{received:true,duplicate:true});
  if(stripeEvent.type.startsWith('customer.subscription.')){
   // Fetch latest Stripe state so out-of-order events do not overwrite newer status.
   const id=stripeEvent.data.object.id;
   const sub=await stripe.subscriptions.retrieve(id);
   await syncSubscription(sub);
  }
  await db('stripe_webhook_events?on_conflict=stripe_event_id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates'},body:JSON.stringify({stripe_event_id:stripeEvent.id,event_type:stripeEvent.type})});
  return json(200,{received:true});
 }catch(e){console.error('Webhook processing failed',e);return json(500,{error:'Webhook processing failed; retry required'});}
};
