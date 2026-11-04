import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {database} from '../server/db.mjs';
const url=process.env.TEST_DATABASE_URL;
if(!url||!new URL(url).pathname.endsWith('_test'))throw new Error('Isolated *_test database required');
execFileSync(process.execPath,['server/migrate.mjs'],{env:{...process.env,DATABASE_URL:url},stdio:'pipe'});
execFileSync(process.execPath,['server/grant.mjs'],{env:{...process.env,DATABASE_URL:url,APP_DB_PASSWORD:randomBytes(32).toString('hex')},stdio:'pipe'});
const pool=database(url),c=await pool.connect();
try{
 await c.query('BEGIN');await c.query('SET LOCAL ROLE erp_app');
 for(const name of ['calculation_runs','user_preferences','saved_reports','management_config','review_assignments'])assert.equal((await c.query('SELECT count(*) FROM portal.'+name)).rowCount,1);
 assert.equal((await c.query("SELECT has_table_privilege(current_user,'portal.calculation_runs','INSERT') ok")).rows[0].ok,true);
 for(const privilege of ['UPDATE','DELETE','TRUNCATE'])assert.equal((await c.query("SELECT has_table_privilege(current_user,'portal.calculation_runs',$1) ok",[privilege])).rows[0].ok,false,privilege);
 for(const name of ['user_preferences','saved_reports','management_config','review_assignments'])assert.equal((await c.query("SELECT has_table_privilege(current_user,$1,'SELECT, INSERT, UPDATE, DELETE') ok",['portal.'+name])).rows[0].ok,true);
 await c.query('ROLLBACK');
}finally{c.release();await pool.end();}
console.log('PASS actual migrate/grant scripts: restricted erp_app can access all management tables and cannot modify or delete calculation history');
