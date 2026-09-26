const BUCKET='gaxity-uploads';
const MAX=95*1024*1024;
const ALLOWED=[0,3600,21600,43200,86400,259200,604800,2592000];

export default {
  async fetch(req,env){
    const u=new URL(req.url);
    if(req.method==='OPTIONS'&&u.pathname.startsWith('/api/')) return new Response(null,{headers:cors()});
    if(req.method==='POST'&&u.pathname==='/api/upload') return upload(req,env);
    if(req.method==='GET'&&u.pathname.startsWith('/f/')) return download(env,u.pathname.slice(3));
    if(req.method==='GET'&&u.pathname==='/api/health') return json({ok:true,service:'gaxity-upload'});
    return env.ASSETS?env.ASSETS.fetch(req):new Response('Gaxity Upload');
  },
  async scheduled(e,env,ctx){ctx.waitUntil(cleanup(env))}
};

async function upload(req,env){
  const form=await req.formData();
  const file=form.get('file');
  const seconds=Number(form.get('expires')||0);
  if(!(file instanceof File)) return json({success:false,error:'No file supplied'},400);
  if(file.size>MAX) return json({success:false,error:'Maximum file size is 95 MB'},413);
  if(!ALLOWED.includes(seconds)) return json({success:false,error:'Invalid expiration'},400);
  const id=crypto.randomUUID().replaceAll('-','');
  const name=(file.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,180)||'file');
  const expiry=seconds?Math.floor(Date.now()/1000)+seconds:0;
  const path=id+'~'+expiry+'~'+name;
  const r=await fetch(env.SUPABASE_URL+'/storage/v1/object/'+BUCKET+'/'+encodeURIComponent(path),{method:'POST',headers:{Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,apikey:env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':file.type||'application/octet-stream'},body:file.stream()});
  if(!r.ok) return json({success:false,error:'Storage upload failed'},502);
  return json({success:true,url:new URL(req.url).origin+'/f/'+path,filename:file.name,size:file.size,expiresAt:expiry?new Date(expiry*1000).toISOString():null});
}

async function download(env,path){
  const p=path.split('~');
  if(p.length<3||path.includes('..')) return new Response('Not found',{status:404,headers:security()});
  const expiry=Number(p[1]);
  if(expiry&&Date.now()/1000>=expiry){await del(env,path);return new Response('This file has expired.',{status:410,headers:security()})}
  const r=await fetch(env.SUPABASE_URL+'/storage/v1/object/'+BUCKET+'/'+encodeURIComponent(path),{headers:{Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,apikey:env.SUPABASE_SERVICE_ROLE_KEY}});
  if(!r.ok) return new Response('File not found.',{status:404,headers:security()});
  const h=new Headers(r.headers);h.set('Content-Disposition','inline; filename="'+p.slice(2).join('~').replace(/["\\r\\n]/g,'_')+'"');
  Object.entries(security()).forEach(([k,v])=>h.set(k,v));
  return new Response(r.body,{status:200,headers:h});
}

async function del(env,path){
  await fetch(env.SUPABASE_URL+'/storage/v1/object/'+BUCKET+'/'+encodeURIComponent(path),{method:'DELETE',headers:{Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,apikey:env.SUPABASE_SERVICE_ROLE_KEY}});
}

async function cleanup(env){
  const now=Math.floor(Date.now()/1000); let offset=0;
  while(true){
    const r=await fetch(env.SUPABASE_URL+'/storage/v1/object/list/'+BUCKET,{method:'POST',headers:{Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,apikey:env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({prefix:'',limit:100,offset})});
    if(!r.ok) return;
    const items=await r.json(); if(!Array.isArray(items)||!items.length) return;
    for(const o of items){const e=Number(String(o.name).split('~')[1]);if(e&&e<=now) await del(env,o.name)}
    if(items.length<100) return; offset+=100;
  }
}

function security(){return {'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':'sandbox'}}
function cors(){return {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'}}
function json(x,s=200){return new Response(JSON.stringify(x),{status:s,headers:{'Content-Type':'application/json',...cors()}})}
