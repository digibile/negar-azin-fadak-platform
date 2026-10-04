import {pool} from "./db.js";
import "dotenv/config";

const BATCH_SIZE=Math.min(100,Math.max(1,Number(process.env.NOTIFICATION_WORKER_BATCH||25)));
const POLL_MS=Math.max(1000,Number(process.env.NOTIFICATION_WORKER_POLL_MS||3000));
const MAX_ATTEMPTS=Math.max(1,Number(process.env.NOTIFICATION_WORKER_MAX_ATTEMPTS||8));
const LOCK_TTL_MS=Math.max(30000,Number(process.env.NOTIFICATION_WORKER_LOCK_TTL_MS||300000));
const WORKER_ID=process.env.NOTIFICATION_WORKER_ID||`notification-worker-${process.pid}`;

type OutboxRow={
 id:string;tenant_id:string;notification_id:string|null;channel:string;destination:string|null;
 payload:Record<string,unknown>;attempts:number;
};

function retryAt(attempt:number){
 const seconds=Math.min(900,Math.max(5,2**Math.min(attempt,8)*5));
 return new Date(Date.now()+seconds*1000);
}

async function claimBatch():Promise<OutboxRow[]>{
 const client=await pool.connect();
 try{
  await client.query("begin");
  await client.query(
   "update notification_outbox set status='queued',locked_at=null,locked_by=null,updated_at=now() where status='processing' and locked_at<now()-($1::text)::interval",
   [`${Math.ceil(LOCK_TTL_MS/1000)} seconds`]
  );
  const r=await client.query(
   `with picked as (
      select id from notification_outbox
      where status='queued' and available_at<=now()
      order by created_at,id
      for update skip locked
      limit $1
    )
    update notification_outbox o
    set status='processing',locked_at=now(),locked_by=$2,updated_at=now()
    from picked
    where o.id=picked.id
    returning o.id,o.tenant_id,o.notification_id,o.channel,o.destination,o.payload,o.attempts`,
   [BATCH_SIZE,WORKER_ID]
  );
  await client.query("commit");
  return r.rows;
 }catch(error){
  await client.query("rollback");
  throw error;
 }finally{client.release();}
}

async function deliver(row:OutboxRow){
 const channel=row.channel.trim().toLowerCase();
 if(channel==="in_app") return;
 throw new Error(`کانال ${channel} هنوز provider اجرایی متصل ندارد`);
}

async function processRow(row:OutboxRow){
 const client=await pool.connect();
 try{
  await deliver(row);
  await client.query(
   "update notification_outbox set status='sent',sent_at=now(),updated_at=now(),locked_at=null,locked_by=null,last_error=null where id=$1 and status='processing' and locked_by=$2",
   [row.id,WORKER_ID]
  );
  if(row.notification_id){
   await client.query(
    "update platform_notifications set status='sent' where id=$1 and tenant_id=$2",
    [row.notification_id,row.tenant_id]
   );
  }
 }catch(error){
  const attempts=row.attempts+1;
  const final=attempts>=MAX_ATTEMPTS;
  const message=error instanceof Error?error.message:String(error);
  await client.query(
   "update notification_outbox set status=$1,attempts=$2,available_at=$3,last_error=$4,updated_at=now(),locked_at=null,locked_by=null where id=$5 and status='processing' and locked_by=$6",
   [final?"failed":"queued",attempts,retryAt(attempts),message.slice(0,1000),row.id,WORKER_ID]
  );
 }finally{client.release();}
}

async function sweep(){
 const rows=await claimBatch();
 for(const row of rows) await processRow(row);
 return rows.length;
}

let stopping=false;
async function main(){
 console.log("Notification worker started",WORKER_ID);
 while(!stopping){
  try{
   const count=await sweep();
   if(count===0)await new Promise(r=>setTimeout(r,POLL_MS));
  }catch(error){
   console.error("Notification worker error",error);
   await new Promise(r=>setTimeout(r,POLL_MS));
  }
 }
 await pool.end();
}
process.on("SIGTERM",()=>{stopping=true});
process.on("SIGINT",()=>{stopping=true});
main().catch(error=>{console.error(error);process.exitCode=1;});
