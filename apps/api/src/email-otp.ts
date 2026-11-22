export async function sendEmailOtp(to:string,code:string,brand="سوکار"):Promise<{ok:boolean;info:string}>{
 const key=process.env.RESEND_API_KEY?.trim()||"";
 const from=process.env.AUTH_EMAIL_FROM?.trim()||"";
 if(!key||!from)return {ok:false,info:"email_provider_not_configured"};
 try{
  const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"authorization":"Bearer "+key,"content-type":"application/json"},body:JSON.stringify({from,to:[to],subject:"کد ورود یک‌بارمصرف "+brand,html:`<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;max-width:520px;margin:24px auto;padding:28px;border:1px solid #e8ebef;border-radius:18px;color:#172b3b"><h2 style="font-size:20px">کد ورود شما</h2><p>برای ورود امن به ${brand} از کد زیر استفاده کنید:</p><div style="direction:ltr;text-align:center;letter-spacing:9px;font-size:30px;font-weight:bold;padding:18px;background:#f5f6f7;border-radius:12px">${code}</div><p style="color:#667085;font-size:12px">این کد تا دو دقیقه معتبر است. آن را در اختیار هیچ‌کس قرار ندهید.</p></div>`}) ,signal:AbortSignal.timeout(10000)});
  if(!response.ok)return {ok:false,info:"email_provider_http_"+response.status};
  return {ok:true,info:"email_sent"};
 }catch(error){return {ok:false,info:error instanceof Error?error.name:"email_send_failed"};}
}
