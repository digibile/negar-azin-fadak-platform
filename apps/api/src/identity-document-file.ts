export type SupportedIdentityDocument={bytes:Buffer;mimeType:"application/pdf"|"image/jpeg"|"image/png"|"image/webp"};

export function decodeIdentityDocument(value:unknown):SupportedIdentityDocument|null{
 if(typeof value!=="string"||value.length>14*1024*1024)return null;
 const raw=value.replace(/^data:[^;]+;base64,/i,"").replace(/\s/g,"");
 if(!raw||raw.length%4!==0)return null;
 const padding=raw.endsWith("==")?2:raw.endsWith("=")?1:0;
 for(let i=0;i<raw.length;i++){
  const code=raw.charCodeAt(i),isAlpha=(code>=65&&code<=90)||(code>=97&&code<=122),isDigit=code>=48&&code<=57;
  if(!(isAlpha||isDigit||code===43||code===47||(code===61&&i>=raw.length-padding)))return null;
 }
 const bytes=Buffer.from(raw,"base64");
 if(!bytes.length||bytes.length>8*1024*1024)return null;
 if(bytes.length>=5&&bytes.subarray(0,5).toString("ascii")==="%PDF-")return {bytes,mimeType:"application/pdf"};
 if(bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return {bytes,mimeType:"image/jpeg"};
 if(bytes.length>=8&&bytes.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])))return {bytes,mimeType:"image/png"};
 if(bytes.length>=12&&bytes.subarray(0,4).toString("ascii")==="RIFF"&&bytes.subarray(8,12).toString("ascii")==="WEBP")return {bytes,mimeType:"image/webp"};
 return null;
}

export function safeDocumentFileName(value:unknown):string{
 const name=String(value||"document").replace(/[\\/\u0000-\u001f\u007f]/g,"_").trim().slice(0,180);
 return name||"document";
}
