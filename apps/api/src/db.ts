import pg from "pg";
import "dotenv/config";
const {Pool}=pg;
export const pool=new Pool({connectionString:process.env.DATABASE_URL,max:10,idleTimeoutMillis:30000,connectionTimeoutMillis:5000});
export function query(text:string,params:unknown[]=[]){return pool.query(text,params);}
