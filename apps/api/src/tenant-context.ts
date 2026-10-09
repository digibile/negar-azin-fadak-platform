import {query} from "./db.js";

export type TenantContext={id:string;name:string;code:string};

function host(req:any):string{
  return typeof req.hostname==="string"?req.hostname.trim().toLowerCase().replace(/\.$/,""):"";
}

export async function resolveTenant(req:any,user:{id:string;role:string}):Promise<TenantContext|null>{
  const requested=typeof req.headers["x-tenant-id"]==="string"?req.headers["x-tenant-id"].trim():"";
  if(requested){
    const r=user.role==="admin"
      ?await query("select id,name,code from tenants where id=$1 and status='active'",[requested])
      :await query("select t.id,t.name,t.code from tenants t join user_tenants ut on ut.tenant_id=t.id where ut.user_id=$1 and t.id=$2 and t.status='active'",[user.id,requested]);
    return r.rowCount?r.rows[0]:null;
  }
  const currentHost=host(req);
  if(currentHost){
    const byDomain=await query("select t.id,t.name,t.code from seller_domains d join tenants t on t.id=d.tenant_id where d.hostname=$1 and d.verification_status='verified' and t.status='active' limit 1",[currentHost]);
    if(byDomain.rowCount){
      const tenant=byDomain.rows[0];
      if(user.role==="admin") return tenant;
      const member=await query("select 1 from user_tenants where user_id=$1 and tenant_id=$2",[user.id,tenant.id]);
      if(member.rowCount) return tenant;
    }
  }
  const r=user.role==="admin"
    ?await query("select id,name,code from tenants where status='active' order by created_at limit 1")
    :await query("select t.id,t.name,t.code from tenants t join user_tenants ut on ut.tenant_id=t.id where ut.user_id=$1 and t.status='active' order by ut.is_default desc,t.created_at limit 1",[user.id]);
  return r.rowCount?r.rows[0]:null;
}

export async function resolvePublicTenant(req:any,requestedCode?:string):Promise<TenantContext|null>{
  const currentHost=host(req);
  if(currentHost){
    const byDomain=await query("select t.id,t.name,t.code from seller_domains d join tenants t on t.id=d.tenant_id where d.hostname=$1 and d.verification_status='verified' and t.status='active' limit 1",[currentHost]);
    if(byDomain.rowCount) return byDomain.rows[0];
  }
  const code=(requestedCode||"").trim();
  if(currentHost && !code) return null;
  const r=code
    ?await query("select id,name,code from tenants where code=$1 and status='active'",[code])
    :await query("select id,name,code from tenants where status='active' order by created_at limit 1");
  return r.rowCount?r.rows[0]:null;
}
