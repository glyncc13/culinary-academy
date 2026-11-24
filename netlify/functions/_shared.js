const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const base = () => process.env.SUPABASE_URL.replace(/\/$/, '');
const adminHeaders = () => ({ apikey:process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type':'application/json' });
const json = (statusCode, value) => ({statusCode,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(value)});
async function db(path, options={}) {
 const response = await fetch(`${base()}/rest/v1/${path}`,{...options,headers:{...adminHeaders(),...(options.headers||{})}});
 if(!response.ok) throw new Error(`Supabase ${response.status}: ${await response.text()}`);
 const raw = await response.text(); return raw ? JSON.parse(raw) : null;
}
async function currentUser(event) {
 const bearer = event.headers.authorization || event.headers.Authorization || '';
 const token = /^Bearer (.+)$/.exec(bearer)?.[1];
 if(!token) throw new Error('Missing sign-in token');
 const response = await fetch(`${base()}/auth/v1/user`,{headers:{apikey:process.env.SUPABASE_ANON_KEY,Authorization:`Bearer ${token}`}});
 if(!response.ok) throw new Error('Invalid or expired sign-in token');
 return response.json();
}
const site = () => {const u=new URL(process.env.SITE_URL);if(u.protocol!=='https:' && u.hostname!=='localhost')throw Error('Invalid SITE_URL');return u.origin;};
module.exports={stripe,db,json,currentUser,site};
