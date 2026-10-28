import { readFile } from 'node:fs/promises';
import { database } from './db.mjs';
const pool=database();
try{await pool.query(await readFile(new URL('../infra/db/migrations/001_core.sql',import.meta.url),'utf8'));await pool.query(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));await pool.query(await readFile(new URL('./upgrade.sql',import.meta.url),'utf8'));console.log('PostgreSQL migratsiyalari bajarildi.');}finally{await pool.end();}
