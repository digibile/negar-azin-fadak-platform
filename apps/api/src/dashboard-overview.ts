import {Router} from "express";
import {query} from "./db.js";
import {requireAuth} from "./auth.js";
import {resolveTenant} from "./tenant-context.js";

const router=Router();

router.get("/api/dashboard/overview",requireAuth,async(req:any,res)=>{
 const tenant=await resolveTenant(req,req.user);
 if(!tenant)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const [modules,records,entries,notifications,audit,inventory]=await Promise.all([
  query("select count(*)::int total,count(*) filter(where is_active=true)::int active from platform_modules"),
  query("select count(*)::int total,count(*) filter(where status='active')::int active from module_records where tenant_id=$1",[tenant.id]),
  query("select count(*)::int total,coalesce(sum(ll.debit),0)::numeric debit,coalesce(sum(ll.credit),0)::numeric credit from ledger_entries le join ledger_lines ll on ll.entry_id=le.id where le.tenant_id=$1",[tenant.id]),
  query("select count(*)::int total,count(*) filter(where status='queued')::int queued,count(*) filter(where status='sent')::int sent,count(*) filter(where read_at is null)::int unread from platform_notifications where tenant_id=$1",[tenant.id]),
  query("select count(*)::int total from platform_audit_events where tenant_id=$1",[tenant.id]),
  query("select count(*)::int total,coalesce(sum(quantity),0)::numeric quantity from inventory_movements where tenant_id=$1",[tenant.id])
 ]);
 const recent=await query("select id,action,entity_type,entity_id,created_at from platform_audit_events where tenant_id=$1 order by created_at desc limit 12",[tenant.id]);
 res.json({tenant:{id:tenant.id,name:tenant.name},kpis:{
  modules:modules.rows[0],records:records.rows[0],ledger:entries.rows[0],notifications:notifications.rows[0],audit:audit.rows[0],inventory:inventory.rows[0]
 },recent:recent.rows});
});

export {router as dashboardOverviewRouter};
