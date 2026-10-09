import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {pool,query} from "./db.js";

async function main(){
 const here=path.dirname(fileURLToPath(import.meta.url));
 const dir=path.resolve(here,"../../../database/migrations");
 await query("create table if not exists schema_migrations(version text primary key, applied_at timestamptz not null default now())");
 const files=(await fs.readdir(dir)).filter(x=>x.endsWith(".sql")).sort();
 for(const file of files){
  const exists=await query("select 1 from schema_migrations where version=$1",[file]);
  if(exists.rowCount)continue;
  console.log(`[migration] applying ${file}`);
  const rawSql=await fs.readFile(path.join(dir,file),"utf8");
  // Keep each migration and its ledger entry in one transaction, even when older files
  // include their own top-level BEGIN/COMMIT wrappers.
  const sql=rawSql
   .replace(/^\s*begin\s*;\s*$/gim,"")
   .replace(/^\s*commit\s*;\s*$/gim,"");
  const client=await pool.connect();
  try{await client.query("begin");await client.query(sql);await client.query("insert into schema_migrations(version) values($1)",[file]);await client.query("commit");console.log("applied",file);}
  catch(error){await client.query("rollback");throw error}
  finally{client.release();}
 }
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>pool.end());
