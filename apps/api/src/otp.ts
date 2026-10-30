import {createHmac,randomInt,timingSafeEqual} from "node:crypto";

export function normalizeIranMobile(value:unknown):string{
  if(typeof value!=="string")return "";
  let digits=value.replace(/[۰-۹]/g,d=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g,d=>String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/\D/g,"");
  if(digits.startsWith("0098"))digits=digits.slice(2);
  if(digits.startsWith("98"))digits="0"+digits.slice(2);
  return /^09\d{9}$/.test(digits)?digits:"";
}

export function createOtpCode():string{return randomInt(0,1_000_000).toString().padStart(6,"0");}

export function otpDigest(phone:string,code:string,pepper=process.env.OTP_PEPPER||""):string{
  if(pepper.length<24||pepper==="change-me")throw new Error("OTP_PEPPER must contain at least 24 non-placeholder characters");
  return createHmac("sha256",pepper).update(phone+":"+code).digest("hex");
}

export function verifyOtpDigest(expected:string,phone:string,code:string,pepper=process.env.OTP_PEPPER||""):boolean{
  if(!/^[a-f0-9]{64}$/i.test(expected))return false;
  const actual=otpDigest(phone,code,pepper);
  return timingSafeEqual(Buffer.from(expected,"hex"),Buffer.from(actual,"hex"));
}

export async function sendKavenegarOtp(phone:string,code:string,brand="سوکار"):Promise<{ok:boolean;info:string}>{
  const key=process.env.KAVENEGAR_API_KEY?.trim()||"";
  if(!key||key==="YOUR_API_KEY")return {ok:false,info:"sms_provider_not_configured"};
  const sender=process.env.KAVENEGAR_SENDER?.trim()||"";
  const form=new URLSearchParams({receptor:phone,message:`کد ورود ${brand}: ${code}\nاین کد را به کسی ندهید.`});
  if(sender)form.set("sender",sender);
  try{
    const response=await fetch(`https://api.kavenegar.com/v1/${encodeURIComponent(key)}/sms/send.json`,{
      method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:form,
      signal:AbortSignal.timeout(10_000)
    });
    const body=await response.json().catch(()=>null) as any;
    const providerStatus=Number(body?.return?.status);
    const ok=response.ok&&providerStatus>=200&&providerStatus<300;
    return {ok,info:ok?"http_"+response.status:"provider_http_"+response.status+"_status_"+(Number.isFinite(providerStatus)?providerStatus:"unknown")};
  }catch(error){return {ok:false,info:error instanceof Error?error.name:"sms_send_failed"};}
}
