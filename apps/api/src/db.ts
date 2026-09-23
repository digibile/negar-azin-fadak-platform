import pg from "pg";
import "dotenv/config";
const {Pool}=pg;
export const pool=new Pool({connectionString:process.env.DATABASE_URL,max:10,idleTimeoutMillis:30000,connectionTimeoutMillis:5000});
export async function query<T=any>(text:string,params:unknown[]=[]){return pool.query<T>(text,params);}
