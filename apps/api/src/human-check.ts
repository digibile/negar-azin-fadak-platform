import {createHmac,randomBytes,randomInt} from "node:crypto";
const secret=()=>process.env.JWT_SECRET||"development-only-change-me";
const sign=(payload:string)=>createHmac("sha256",secret()).update(payload).digest("hex");
export function issueHumanCheck(){
 const answer=String(randomInt(10000,100000)),nonce=randomBytes(12).toString("hex"),expires=Date.now()+300000;
 const payload=Buffer.from(JSON.stringify({answer,nonce,expires})).toString("base64url");
 const colors=["#263d50","#526b7c","#8a7044"];
 const noise=Array.from({length:9},(_,i)=>'<path d="M '+(i*19)+' 4 l 13 34" stroke="#8b9298" stroke-opacity=".22" stroke-width="1"/>').join("");
 const chars=answer.split("").map((digit,i)=>'<text x="'+(20+i*27)+'" y="'+(34+(i%2?2:-2))+'" transform="rotate('+(i%2?5:-5)+' '+(20+i*27)+' 27)" fill="'+colors[i%colors.length]+'" font-size="25" font-family="monospace" font-weight="800">'+digit+'</text>').join("");
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="150" height="48" viewBox="0 0 150 48"><rect width="150" height="48" rx="8" fill="#eee9dd"/>'+noise+'<path d="M8 39 Q45 2 78 33 T145 9" fill="none" stroke="#9d8d70" stroke-opacity=".4" stroke-width="1.5"/>'+chars+'</svg>';
 return {challenge:payload+"."+sign(payload),question:"کد امنیتی پنج‌رقمی",image:"data:image/svg+xml;base64,"+Buffer.from(svg).toString("base64")};
}
export function verifyHumanCheck(token:string,answer:string){
 try{const [payload,mac]=token.split(".");if(!payload||!mac||sign(payload)!==mac)return false;const d=JSON.parse(Buffer.from(payload,"base64url").toString("utf8")) as {answer:string;expires:number};const normalized=String(answer).replace(/[۰-۹]/g,d=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g,d=>String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));return Date.now()<d.expires&&normalized===d.answer;}catch{return false;}
}
