import {database,transaction,audit} from './db.mjs';
import {passwordHash,passwordValid} from './auth.mjs';
const {USER_EMAIL:email,USER_NAME:name,USER_ROLE:role='ADMIN',USER_PASSWORD:password}=process.env;
if(!email||!name||!passwordValid(password)||!['ADMIN','OPERATOR','APPROVER','AUDITOR'].includes(role))throw new Error('USER_EMAIL, USER_NAME, USER_ROLE va kamida 14 belgili USER_PASSWORD kerak. Qiymatlarni terminal tarixiga yozmang; xavfsiz env fayl yoki yashirin inputdan foydalaning.');
const pool=database();try{await transaction(pool,async c=>{const {rows}=await c.query('INSERT INTO portal.users(email,name,role,password_hash) VALUES($1,$2,$3,$4) RETURNING id',[email.trim().toLowerCase(),name.trim(),role,await passwordHash(password)]);await audit(c,rows[0].id,'USER_CREATED',rows[0].id,{role});});console.log('Foydalanuvchi yaratildi.');}finally{await pool.end();}
