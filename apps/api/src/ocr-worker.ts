import {execFile} from "node:child_process";
import {mkdtemp,rm,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {pool} from "./db.js";
import {parseIranianIdentityText} from "./identity-ocr-parser.js";
import "dotenv/config";

type OcrJob={id:string;tenant_id:string;attachment_id:string;language_hint:string|null;attempts:number};
type OcrAttachment={mime_type:string;binary_data:Buffer};

const BATCH_SIZE=Math.min(8,Math.max(1,Number(process.env.OCR_WORKER_BATCH||2)));
const POLL_MS=Math.max(1000,Number(process.env.OCR_WORKER_POLL_MS||3000));
const MAX_ATTEMPTS=Math.min(5,Math.max(1,Number(process.env.OCR_WORKER_MAX_ATTEMPTS||3)));
const LOCK_TTL_SECONDS=Math.max(60,Number(process.env.OCR_WORKER_LOCK_TTL_SECONDS||300));
const TESSERACT=process.env.OCR_TESSERACT_PATH||"tesseract";
const LANGUAGES=process.env.OCR_LANGUAGES||"fas+eng";
const WORKER_ID=process.env.OCR_WORKER_ID||"ocr-worker-"+process.pid;
const OCR_TIMEOUT_MS=40000;
const MAX_TEXT_BYTES=200000;
let stopping=false;

function delay(ms:number){return new Promise(resolve=>setTimeout(resolve,ms));}

function normalizeLanguages(value:string|null){
 const aliases:Record<string,string>={fa:"fas",en:"eng"};
 const parts=(value||LANGUAGES).split("+").map(x=>aliases[x.trim()]||x.trim()).filter(x=>/^[a-z_]{2,12}$/.test(x));
 return parts.length?Array.from(new Set(parts)).join("+"):"fas+eng";
}

function imageExtension(bytes:Buffer):string|null{
 if(bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return ".jpg";
 if(bytes.length>=8&&bytes.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])))return ".png";
 if(bytes.length>=12&&bytes.subarray(0,4).toString("ascii")==="RIFF"&&bytes.subarray(8,12).toString("ascii")==="WEBP")return ".webp";
 return null;
}

function runTesseract(file:string,languages:string):Promise<string>{
 return new Promise((resolve,reject)=>{
  execFile(TESSERACT,[file,"stdout","-l",languages,"--psm","6"],{timeout:OCR_TIMEOUT_MS,maxBuffer:4*1024*1024,encoding:"utf8"},(error,stdout,stderr)=>{
   if(error){(error as NodeJS.ErrnoException & {stderr?:string}).stderr=String(stderr||"").slice(0,1000);reject(error);return;}
   resolve(String(stdout||""));
  });
 });
}

async function claimBatch():Promise<OcrJob[]>{
 const client=await pool.connect();
 try{
  await client.query("begin");
  await client.query("update platform_ocr_jobs set status='queued',updated_at=now(),error_message=coalesce(error_message,'OCR worker lease expired') where provider_code='tesseract-local' and status='processing' and updated_at<now()-($1 * interval '1 second')",[LOCK_TTL_SECONDS]);
  const r=await client.query("with picked as (select id from platform_ocr_jobs where provider_code='tesseract-local' and status='queued' order by created_at,id for update skip locked limit $1) update platform_ocr_jobs j set status='processing',attempts=j.attempts+1,updated_at=now(),error_message=null from picked where j.id=picked.id returning j.id,j.tenant_id,j.attachment_id,j.language_hint,j.attempts",[BATCH_SIZE]);
  await client.query("commit");
  return r.rows;
 }catch(error){await client.query("rollback");throw error}
 finally{client.release()}
}

async function completeJob(job:OcrJob,status:"completed"|"needs_review",text:string,extracted:any,errorMessage:string|null){
 const client=await pool.connect();
 try{
  await client.query("begin");
  await client.query("update platform_ocr_jobs set status=$1,extracted_json=$2,error_message=$3,confidence=null,completed_at=now(),updated_at=now() where id=$4 and tenant_id=$5",[status,extracted,errorMessage,job.id,job.tenant_id]);
  await client.query("update platform_attachments set ocr_status=$1,extracted_text=$2,updated_at=now() where id=$3 and tenant_id=$4",[status,text.slice(0,MAX_TEXT_BYTES),job.attachment_id,job.tenant_id]);
  await client.query("commit");
 }catch(error){await client.query("rollback");throw error}
 finally{client.release()}
}

async function failJob(job:OcrJob,error:unknown){
 const message=(error instanceof Error?error.message:String(error||"OCR failed")).slice(0,1000);
 const status=job.attempts>=MAX_ATTEMPTS?"failed":"queued";
 const client=await pool.connect();
 try{
  await client.query("begin");
  await client.query("update platform_ocr_jobs set status=$1,error_message=$2,updated_at=now() where id=$3 and tenant_id=$4",[status,message,job.id,job.tenant_id]);
  await client.query("update platform_attachments set ocr_status=$1,updated_at=now() where id=$2 and tenant_id=$3",[status,job.attachment_id,job.tenant_id]);
  await client.query("commit");
 }catch(dbError){await client.query("rollback");throw dbError}
 finally{client.release()}
}

async function processJob(job:OcrJob){
 const attachment=await pool.query<OcrAttachment>("select mime_type,binary_data from platform_attachments where id=$1 and tenant_id=$2",[job.attachment_id,job.tenant_id]);
 if(!attachment.rowCount){await failJob(job,new Error("پیوست OCR پیدا نشد"));return;}
 const row=attachment.rows[0],extension=imageExtension(row.binary_data);
 if(!extension||!String(row.mime_type||"").startsWith("image/")){
  await completeJob(job,"needs_review","",{fields:{},validatedFields:[],kycUpdated:false,note:"فایل تصویری قابل پردازش نیست؛ بررسی انسانی لازم است."},"نوع فایل برای OCR محلی پشتیبانی نمی‌شود");
  return;
 }
 const directory=await mkdtemp(join(tmpdir(),"naf-ocr-"));
 const file=join(directory,"identity"+extension);
 try{
  await writeFile(file,row.binary_data);
  const text=await runTesseract(file,normalizeLanguages(job.language_hint));
  const parsed=parseIranianIdentityText(text);
  const extracted={...parsed,provider:"tesseract-local",kycUpdated:false,jobId:job.id};
  await completeJob(job,parsed.status,text,extracted,parsed.status==="needs_review"?parsed.note:null);
  process.stdout.write(JSON.stringify({worker:WORKER_ID,jobId:job.id,status:parsed.status,textLength:text.length})+"\n");
 }catch(error){
  await failJob(job,error);
  process.stderr.write(JSON.stringify({worker:WORKER_ID,jobId:job.id,error:(error instanceof Error?error.message:String(error)).slice(0,200)})+"\n");
 }finally{
  await rm(directory,{recursive:true,force:true});
 }
}

async function run(){
 process.stdout.write(JSON.stringify({worker:WORKER_ID,event:"started",languages:LANGUAGES,batch:BATCH_SIZE})+"\n");
 while(!stopping){
  try{
   const jobs=await claimBatch();
   if(!jobs.length){await delay(POLL_MS);continue;}
   await Promise.all(jobs.map(processJob));
  }catch(error){
   process.stderr.write(JSON.stringify({worker:WORKER_ID,event:"loop_error",error:error instanceof Error?error.message:String(error)})+"\n");
   await delay(POLL_MS);
  }
 }
 await pool.end();
 process.stdout.write(JSON.stringify({worker:WORKER_ID,event:"stopped"})+"\n");
}

process.on("SIGTERM",()=>{stopping=true;});
process.on("SIGINT",()=>{stopping=true;});
void run().catch(error=>{process.stderr.write(String(error)+"\n");process.exitCode=1;});
