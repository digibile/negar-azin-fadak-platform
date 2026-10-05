import pg from "pg";
import "dotenv/config";

const {Pool}=pg;

const connectionString=process.env.DATABASE_URL;
const poolConfig=connectionString
  ? {connectionString}
  : {
      host:process.env.PGHOST,
      port:Number(process.env.PGPORT||5432),
      user:process.env.PGUSER,
      password:process.env.PGPASSWORD,
      database:process.env.PGDATABASE,
    };

export const pool=new Pool({
  ...poolConfig,
  max:10,
  idleTimeoutMillis:30000,
  connectionTimeoutMillis:5000,
});

export function query(text:string,params:unknown[]=[]){return pool.query(text,params);}
