import { randomBytes,scrypt as scryptCb,timingSafeEqual,createHash } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt=promisify(scryptCb);
export const token=()=>randomBytes(32).toString('hex');
export const hash=s=>createHash('sha256').update(s).digest('hex');
export async function passwordHash(password){const salt=randomBytes(16).toString('hex');return salt+':'+(await scrypt(password,salt,64)).toString('hex');}
export async function passwordMatches(password,stored){const [salt,hex]=stored.split(':');const result=await scrypt(password,salt,64);const expected=Buffer.from(hex,'hex');return result.length===expected.length&&timingSafeEqual(result,expected);}
export function passwordValid(p){return typeof p==='string'&&p.length>=14&&p.length<=200;}
