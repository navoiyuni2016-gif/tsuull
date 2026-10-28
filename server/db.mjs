import pg from 'pg';
export function database(url=process.env.DATABASE_URL){
 if(!url)throw new Error('DATABASE_URL kerak');
 return new pg.Pool({connectionString:url,max:10,connectionTimeoutMillis:5000,idleTimeoutMillis:30000});
}
export async function transaction(pool,fn){const c=await pool.connect();try{await c.query('BEGIN');const result=await fn(c);await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
export async function audit(c,actor,action,id,details={}){await c.query('INSERT INTO portal.audit(actor_id,action,entity_id,details) VALUES($1,$2,$3,$4)',[actor,action,id,JSON.stringify(details)]);}
