import {createHmac} from "node:crypto";

export type PaymentProviderStatus="pending"|"authorized"|"paid"|"failed"|"refunded";

export interface PaymentRequest {
 tenantId:string;
 orderId:string;
 amount:number;
 currency:string;
 paymentNo:string;
 providerRef?:string|null;
 metadata?:Record<string,unknown>;
}

export interface PaymentResult {
 status:PaymentProviderStatus;
 providerCode:string;
 providerTransactionId:string;
 providerPayload:Record<string,unknown>;
 redirectUrl?:string;
}

export interface RefundStatusLookupResult {
 /** Provider-confirmed current state. A timeout or transport error must throw, never map to failed. */
 status:"pending"|"refunded"|"failed";
 providerCode:string;
 providerTransactionId:string;
 /** Provider-issued refund transaction reference, distinct from the original payment transaction. */
 refundTransactionId?:string;
 providerPayload:Record<string,unknown>;
}

export interface RefundStatusLookupRequest {
 providerTransactionId:string;
 amount:number;
 metadata?:Record<string,unknown>;
}

export interface PaymentProvider {
 readonly code:string;
 /** True only when refundPayment deduplicates repeated calls using metadata.idempotencyKey. */
 readonly supportsIdempotentRefunds?:boolean;
 createPayment(input:PaymentRequest):Promise<PaymentResult>;
 verifyPayment(input:{providerTransactionId:string;amount:number;metadata?:Record<string,unknown>}):Promise<PaymentResult>;
 refundPayment(input:{providerTransactionId:string;amount:number;metadata?:Record<string,unknown>}):Promise<PaymentResult>;
 /** Optional authoritative status query. Omit unless the provider documents and implements it. */
 lookupRefundStatus?(input:RefundStatusLookupRequest):Promise<RefundStatusLookupResult>;
}

type HttpAction="create"|"verify"|"refund";

interface HttpProviderConfig {
 code:string;
 endpoint:string;
 secret:string;
 timeoutMs:number;
 idempotentRefunds:boolean;
}

function env(name:string){return process.env[name]?.trim()||"";}

function parseResult(code:string,payload:any):PaymentResult{
 const status=String(payload?.status||"pending").toLowerCase() as PaymentProviderStatus;
 if(!["pending","authorized","paid","failed","refunded"].includes(status)) throw new Error("وضعیت پاسخ درگاه نامعتبر است");
 const tx=String(payload?.providerTransactionId||payload?.transactionId||"").trim();
 if(!tx) throw new Error("شناسه تراکنش درگاه در پاسخ وجود ندارد");
 return {
  status,
  providerCode:code,
  providerTransactionId:tx,
  providerPayload:payload,
  redirectUrl:typeof payload?.redirectUrl==="string"?payload.redirectUrl:undefined
 };
}

async function callHttp(cfg:HttpProviderConfig,action:HttpAction,body:Record<string,unknown>):Promise<PaymentResult>{
 const timestamp=Math.floor(Date.now()/1000).toString();
 const event=JSON.stringify(body);
 const signature=createHmac("sha256",cfg.secret).update(timestamp+"."+event).digest("hex");
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),cfg.timeoutMs);
 try{
  const response=await fetch(cfg.endpoint.replace(/\/$/,"")+"/"+action,{
   method:"POST",
   headers:{
    "content-type":"application/json",
    "x-payment-timestamp":timestamp,
    "x-payment-signature":"sha256="+signature
   },
   body:event,
   signal:controller.signal
  });
  const raw=await response.text();
  let payload:any={};
  try{payload=raw?JSON.parse(raw):{};}catch{throw new Error("پاسخ درگاه JSON معتبر نیست");}
  if(!response.ok) throw new Error(String(payload?.error||payload?.message||("خطای درگاه: HTTP "+response.status)));
  return parseResult(cfg.code,payload);
 }finally{clearTimeout(timer);}
}

class ConfiguredHttpPaymentProvider implements PaymentProvider {
 readonly code:string;
 readonly supportsIdempotentRefunds:boolean;
 private readonly cfg:HttpProviderConfig;
 constructor(cfg:HttpProviderConfig){this.code=cfg.code;this.cfg=cfg;this.supportsIdempotentRefunds=cfg.idempotentRefunds;}
 createPayment(input:PaymentRequest){return callHttp(this.cfg,"create",input as unknown as Record<string,unknown>);}
 verifyPayment(input:{providerTransactionId:string;amount:number;metadata?:Record<string,unknown>}){return callHttp(this.cfg,"verify",input as unknown as Record<string,unknown>);}
 refundPayment(input:{providerTransactionId:string;amount:number;metadata?:Record<string,unknown>}){return callHttp(this.cfg,"refund",input as unknown as Record<string,unknown>);}
}

const providers:Record<string,PaymentProvider>={};

function configured(code:string):PaymentProvider|undefined{
 const normalized=code.toLowerCase().replace(/[^a-z0-9_-]/g,"_");
 const endpoint=env("PAYMENT_PROVIDER_"+normalized.toUpperCase()+"_ENDPOINT");
 const secretRef=env("PAYMENT_PROVIDER_"+normalized.toUpperCase()+"_SECRET");
 if(!endpoint||!secretRef)return undefined;
 return new ConfiguredHttpPaymentProvider({
  code,
  endpoint,
  secret:secretRef,
  timeoutMs:Math.max(1000,Math.min(30000,Number(env("PAYMENT_PROVIDER_"+normalized.toUpperCase()+"_TIMEOUT_MS"))||10000)),
  idempotentRefunds:env("PAYMENT_PROVIDER_"+normalized.toUpperCase()+"_IDEMPOTENT_REFUNDS").toLowerCase()==="true"
 });
}

export type RefundStatusLookupOutcome=
 | {supported:false;providerCode:string}
 | {supported:true;result:RefundStatusLookupResult};

/** Never infer a refund state when the adapter has no documented lookup operation. */
export async function lookupPaymentRefundStatus(provider:PaymentProvider,input:RefundStatusLookupRequest):Promise<RefundStatusLookupOutcome>{
 if(!provider.lookupRefundStatus)return {supported:false,providerCode:provider.code};
 const result=await provider.lookupRefundStatus(input);
 if(result.providerCode!==provider.code||result.providerTransactionId!==input.providerTransactionId){
  throw new Error("پاسخ استعلام بازپرداخت با شناسه درگاه یا تراکنش درخواست‌شده مطابقت ندارد");
 }
 if(!["pending","refunded","failed"].includes(result.status))throw new Error("وضعیت استعلام بازپرداخت نامعتبر است");
 return {supported:true,result};
}

export function getPaymentProvider(code=process.env.PAYMENT_PROVIDER||"unconfigured"):PaymentProvider{
 const provider=providers[code]||configured(code);
 if(!provider) throw new Error("درگاه پرداخت پیکربندی نشده است: "+code);
 providers[code]=provider;
 return provider;
}

export function registerPaymentProvider(provider:PaymentProvider):void{
 if(!/^[a-z0-9_-]+$/.test(provider.code)) throw new Error("کد درگاه پرداخت نامعتبر است");
 providers[provider.code]=provider;
}
