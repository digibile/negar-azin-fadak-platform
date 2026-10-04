import {createHmac,randomBytes} from "node:crypto";
const secret=()=>process.env.JWT_SECRET||"development-only-change-me";
const sign=(payload:string)=>createHmac("sha256",secret()).update(payload).digest("hex");
export function issueHumanCheck(){
 const a=1+Math.floor(Math.random()*9),b=1+Math.floor(Math.random()*9),nonce=randomBytes(12).toString("hex"),expires=Date.now()+300000;
 const payload=Buffer.from(JSON.stringify({a,b,nonce,expires})).toString("base64url");
 return {challenge:payload+"."+sign(payload),question:"حاصل جمع "+a+" + "+b+" چند است؟"};
}
export function verifyHumanCheck(token:string,answer:string){
 try{const [payload,mac]=token.split(".");if(!payload||!mac||sign(payload)!==mac)return false;const d=JSON.parse(Buffer.from(payload,"base64url").toString("utf8")) as {a:number;b:number;expires:number};return Date.now()<d.expires&&Number(answer)===d.a+d.b;}catch{return false;}
}
