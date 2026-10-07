import {pool} from "./db.js";
import {getPaymentProvider} from "./payment-provider.js";
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


async function scheduleCommerceReminders(){
 const client=await pool.connect();
 try{
  await client.query("begin");
  const rows=await client.query(`select r.id,r.tenant_id,r.quote_id,r.channel,r.template_code,r.payload,q.customer_ref,u.id user_id,u.email,
    (select value from user_contact_methods cm where cm.user_id=u.id and cm.channel=r.channel and cm.status='active' order by cm.is_primary desc,cm.created_at limit 1) contact
    from commerce_quote_reminders r
    join commerce_purchase_quotes q on q.id=r.quote_id
    left join users u on q.customer_ref ~ '^[0-9a-fA-F-]{36}$' and u.id=q.customer_ref::uuid
    where r.status='queued' and r.scheduled_at<=now()
    order by r.scheduled_at,r.id
    for update of r skip locked limit $1`,[BATCH_SIZE]);
  for(const row of rows.rows){
   const destination=row.channel==="email"?row.email:row.contact;
   if(!destination && row.channel!=="in_app"){
    await client.query("update commerce_quote_reminders set status='failed' where id=$1",[row.id]);
    continue;
   }
   const n=await client.query("insert into platform_notifications(tenant_id,user_id,channel,title,body,status) values($1,$2,$3,$4,$5,'queued') returning id",[row.tenant_id,row.user_id||null,row.channel,"یادآوری خرید و اعتبار","پیشنهاد خرید شما آماده ادامه فرآیند است."]);
   await client.query("insert into notification_outbox(tenant_id,notification_id,channel,destination,payload,status,available_at,created_at,updated_at) values($1,$2,$3,$4,$5,'queued',now(),now(),now())",[row.tenant_id,n.rows[0].id,row.channel,destination,{quoteId:row.quote_id,templateCode:row.template_code,...(row.payload||{})}]);
   await client.query("update commerce_quote_reminders set status='sent',sent_at=now() where id=$1",[row.id]);
  }
  await client.query("commit");
 }catch(error){await client.query("rollback");throw error}finally{client.release();}
}


async function sweepPaymentReviews(){
 const client=await pool.connect();
 try{
  const rows=await client.query(`select r.id review_id,r.tenant_id,r.payment_intent_id,r.gateway_attempt_id,r.review_deadline_at,
    a.provider_transaction_id,a.amount,a.provider_code,g.auto_reverse_on_timeout
    from payment_merchant_reviews r
    join payment_gateway_attempts a on a.id=r.gateway_attempt_id
    join payment_gateway_profiles g on g.id=a.gateway_profile_id
    where r.status='pending' and a.status='paid_pending_review' and r.review_deadline_at<=now()
    order by r.review_deadline_at,r.id
    for update of r skip locked limit $1`,[BATCH_SIZE]);
  for(const row of rows.rows){
   await client.query("update payment_merchant_reviews set status=$1,reversal_reason=$2,updated_at=now() where id=$3",[
    row.auto_reverse_on_timeout?"reversal_pending":"expired",
    "مهلت تأیید موجودی فروشنده به پایان رسید",
    row.review_id
   ]);
   if(!row.auto_reverse_on_timeout){
    await client.query("update payment_gateway_attempts set status='expired',updated_at=now() where id=$1",[row.gateway_attempt_id]);
    await client.query("update commerce_payment_intents set status='expired',updated_at=now() where id=$1",[row.payment_intent_id]);
    continue;
   }
   await client.query("update payment_gateway_attempts set status='reversal_pending',reversal_requested_at=now(),updated_at=now() where id=$1",[row.gateway_attempt_id]);
   await client.query("update commerce_payment_intents set status='reversal_pending',updated_at=now() where id=$1",[row.payment_intent_id]);
   try{
    if(!row.provider_transaction_id) throw new Error("شناسه تراکنش Provider برای برگشت وجه موجود نیست");
    const provider=getPaymentProvider(row.provider_code||undefined);
    const result=await provider.refundPayment({
     providerTransactionId:row.provider_transaction_id,
     amount:Number(row.amount),
     metadata:{reason:"merchant_review_timeout",reviewId:row.review_id,paymentIntentId:row.payment_intent_id}
    });
    if(result.status!=="refunded") throw new Error("Provider برگشت وجه را نهایی نکرد");
    await client.query("update payment_merchant_reviews set status='reversed',updated_at=now() where id=$1",[row.review_id]);
    await client.query("update payment_gateway_attempts set status='reversed',reversed_at=now(),updated_at=now(),provider_payload=provider_payload||$1 where id=$2",[JSON.stringify(result.providerPayload),row.gateway_attempt_id]);
    await client.query("update commerce_payment_intents set status='reversed',metadata=coalesce(metadata,'{}'::jsonb)||$1::jsonb,updated_at=now() where id=$2",[JSON.stringify({reversal:"merchant_review_timeout",providerCode:result.providerCode}),row.payment_intent_id]);
   }catch(error){
    await client.query("update payment_merchant_reviews set status='reversal_failed',metadata=coalesce(metadata,'{}'::jsonb)||$1::jsonb,updated_at=now() where id=$2",[JSON.stringify({error:error instanceof Error?error.message:String(error)}),row.review_id]);
    await client.query("update payment_gateway_attempts set status='reversal_failed',updated_at=now() where id=$1",[row.gateway_attempt_id]);
    await client.query("update commerce_payment_intents set status='reversal_failed',updated_at=now() where id=$1",[row.payment_intent_id]);
   }
  }
  return rows.rowCount;
 }finally{client.release();}
}

async function sweep(){
 await sweepPaymentReviews();
 await scheduleCommerceReminders();
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
