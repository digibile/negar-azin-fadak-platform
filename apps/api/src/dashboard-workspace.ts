import {Router} from "express";
import {query} from "./db.js";
import {requireAuth,requireCsrf} from "./auth.js";
import {resolveTenant} from "./tenant-context.js";

const router=Router();

async function tenant(req:any){
  return resolveTenant(req,req.user);
}

router.get("/api/dashboard/workspace",requireAuth,async(req,res)=>{
  const t=await tenant(req);
  if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const tab=String(req.query.tab||"dashboard");
  const q=typeof req.query.q==="string"?req.query.q.trim():"";
  const limit=Math.min(100,Math.max(1,Number(req.query.limit)||50));

  const base=await query("select id,code,name,status from tenants where id=$1",[t.id]);
  const tenantRow=base.rows[0];

  if(tab==="executive"||tab==="kpi"){
    const [users,companies,branches,sellers,stores,products,orders,revenue]=await Promise.all([
      query("select count(*)::int total from user_tenants where tenant_id=$1",[t.id]),
      query("select count(*)::int total from companies where tenant_id=$1 and status='active'",[t.id]),
      query("select count(*)::int total from branches where tenant_id=$1 and status='active'",[t.id]),
      query("select count(*)::int total from sellers where tenant_id=$1 and status='active'",[t.id]),
      query("select count(*)::int total from stores where tenant_id=$1 and status='active'",[t.id]),
      query("select count(*)::int total from products where tenant_id=$1 and status='active'",[t.id]),
      query("select count(*)::int total,count(*) filter(where status in ('pending','confirmed','paid','processing','shipped'))::int open,coalesce(sum(total_amount),0)::numeric total_amount from marketplace_orders where tenant_id=$1",[t.id]),
      query("select coalesce(sum(total_amount),0)::numeric amount from marketplace_orders where tenant_id=$1 and status not in ('cancelled','returned','refunded')",[t.id])
    ]);
    return res.json({tab,tenant:tenantRow,kpis:{users:users.rows[0].total,companies:companies.rows[0].total,branches:branches.rows[0].total,sellers:sellers.rows[0].total,stores:stores.rows[0].total,products:products.rows[0].total,orders:orders.rows[0].total,openOrders:orders.rows[0].open,totalOrdersAmount:orders.rows[0].total_amount,revenue:revenue.rows[0].amount}});
  }

  if(tab==="finance"){
    const [ledger,accounts,settlements]=await Promise.all([
      query("select count(distinct le.id)::int entries,coalesce(sum(ll.debit),0)::numeric debit,coalesce(sum(ll.credit),0)::numeric credit from ledger_entries le join ledger_lines ll on ll.entry_id=le.id where le.tenant_id=$1",[t.id]),
      query("select count(*)::int total from ledger_accounts where tenant_id=$1 and status='active'",[t.id]),
      query("select count(*)::int pending_count,coalesce(sum(net_amount),0)::numeric pending_amount from seller_settlements where tenant_id=$1 and status in ('pending','approved')",[t.id])
    ]);
    return res.json({tab,tenant:tenantRow,kpis:{...ledger.rows[0],accounts:accounts.rows[0].total,...settlements.rows[0]}});
  }

  if(tab==="sales"){
    const statusRows=await query("select status,count(*)::int count,coalesce(sum(total_amount),0)::numeric amount from marketplace_orders where tenant_id=$1 group by status order by count desc",[t.id]);
    const recent=await query("select order_no,status,total_amount,currency,created_at,updated_at from marketplace_orders where tenant_id=$1 order by created_at desc limit $2",[t.id,limit]);
    return res.json({tab,tenant:tenantRow,statuses:statusRows.rows,recent:recent.rows});
  }

  if(tab==="operations"){
    const [inventory,stores,orders]=await Promise.all([
      query("select count(*)::int products,coalesce(sum(quantity),0)::numeric quantity,coalesce(sum(reserved_quantity),0)::numeric reserved from product_inventory where tenant_id=$1",[t.id]),
      query("select count(*)::int total,count(*) filter(where status='active')::int active from stores where tenant_id=$1",[t.id]),
      query("select count(*)::int processing from marketplace_orders where tenant_id=$1 and status in ('processing','shipped')",[t.id])
    ]);
    return res.json({tab,tenant:tenantRow,kpis:{inventory:inventory.rows[0],stores:stores.rows[0],orders:orders.rows[0]}});
  }

  if(tab==="branches"){
    const rows=await query("select id,code,name,status,created_at,updated_at from branches where tenant_id=$1 order by name",[t.id]);
    return res.json({tab,tenant:tenantRow,items:rows.rows});
  }

  if(tab==="alerts"){
    const [sla,notifications]=await Promise.all([
      query("select count(*) filter(where status='open')::int open,count(*) filter(where status='breached')::int breached,count(*) filter(where status='paused')::int paused from sla_cases where tenant_id=$1",[t.id]),
      query("select count(*) filter(where status='queued')::int queued,count(*) filter(where status='failed')::int failed,count(*) filter(where read_at is null)::int unread from platform_notifications where tenant_id=$1",[t.id])
    ]);
    return res.json({tab,tenant:tenantRow,sla:sla.rows[0],notifications:notifications.rows[0]});
  }

  if(tab==="activity"){
    const rows=await query("select id,action,entity_type,entity_id,actor_user_id,created_at from platform_audit_events where tenant_id=$1 and ($2='' or action ilike $3 or entity_type ilike $3) order by created_at desc limit $4",[t.id,q,q?"%"+q+"%":"",limit]);
    return res.json({tab,tenant:tenantRow,items:rows.rows});
  }

  if(tab==="notifications"){
    const rows=await query("select id,channel,title,body,status,created_at,read_at from platform_notifications where tenant_id=$1 order by created_at desc limit $2",[t.id,limit]);
    return res.json({tab,tenant:tenantRow,items:rows.rows});
  }

  return res.status(400).json({error:"نمای داشبورد ناشناخته است"});
});

router.post("/api/dashboard/notifications/:id/read",requireAuth,requireCsrf,async(req,res)=>{
  const t=await tenant(req);
  if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
  const r=await query("update platform_notifications set read_at=coalesce(read_at,now()) where id=$1 and tenant_id=$2 returning id,read_at",[req.params.id,t.id]);
  if(!r.rowCount)return res.status(404).json({error:"اعلان پیدا نشد"});
  res.json(r.rows[0]);
});

export {router as dashboardWorkspaceRouter};
