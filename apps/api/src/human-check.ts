import {createHmac,randomBytes,randomInt} from "node:crypto";
const secret=()=>process.env.JWT_SECRET||"development-only-change-me";
const sign=(payload:string)=>createHmac("sha256",secret()).update(payload).digest("hex");
export function issueHumanCheck(){
 const answer=String(randomInt(10000,100000)),nonce=randomBytes(12).toString("hex"),expires=Date.now()+300000;
 const payload=Buffer.from(JSON.stringify({answer,nonce,expires})).toString("base64url");
 return {challenge:payload+"."+sign(payload),question:"کد امنیتی: "+answer};
}
export function verifyHumanCheck(token:string,answer:string){
 try{const [payload,mac]=token.split(".");if(!payload||!mac||sign(payload)!==mac)return false;const d=JSON.parse(Buffer.from(payload,"base64url").toString("utf8")) as {answer:string;expires:number};return Date.now()<d.expires&&String(answer).replace(/[۰-۹]/g,d=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g,d=>String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))===d.answer;}catch{return false;}
}
