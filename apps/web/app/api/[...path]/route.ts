import {NextRequest,NextResponse} from "next/server";

const API_INTERNAL_URL=(process.env.API_INTERNAL_URL||"http://api:4000").replace(/\/$/,"");

async function proxy(req:NextRequest,{params}:{params:Promise<{path:string[]}>}){
  const {path}=await params;
  const target=`${API_INTERNAL_URL}/${path.join("/")}${req.nextUrl.search}`;
  const headers=new Headers(req.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.delete("connection");

  const body=req.method==="GET"||req.method==="HEAD"?undefined:await req.arrayBuffer();
  const response=await fetch(target,{
    method:req.method,
    headers,
    body,
    redirect:"manual",
    cache:"no-store"
  });

  const responseHeaders=new Headers(response.headers);
  responseHeaders.delete("content-length");
  responseHeaders.delete("transfer-encoding");
  responseHeaders.delete("connection");

  const setCookies=response.headers.getSetCookie?.()||[];
  responseHeaders.delete("set-cookie");
  for(const cookie of setCookies) responseHeaders.append("set-cookie",cookie);

  return new NextResponse(response.body,{
    status:response.status,
    statusText:response.statusText,
    headers:responseHeaders
  });
}

export const GET=proxy;
export const HEAD=proxy;
export const POST=proxy;
export const PUT=proxy;
export const PATCH=proxy;
export const DELETE=proxy;
export const OPTIONS=proxy;
