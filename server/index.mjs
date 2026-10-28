import {database} from './db.mjs';
import {createApp} from './app.mjs';
const port=Number(process.env.PORT||8080);
if(process.env.NODE_ENV==='production'&&(!process.env.APP_ORIGIN?.startsWith('https://')||!process.env.DATABASE_URL))throw new Error('Production uchun HTTPS APP_ORIGIN va DATABASE_URL kerak.');
const pool=database();await pool.query('SELECT 1 FROM portal.users LIMIT 1');
const server=createApp(pool).listen(port,'0.0.0.0',()=>console.log(`ERP server port ${port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.close(async()=>{await pool.end();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();});
