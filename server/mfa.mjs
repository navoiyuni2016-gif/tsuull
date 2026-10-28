import {randomBytes,createHmac,createCipheriv,createDecipheriv,timingSafeEqual} from 'node:crypto';
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function secret(){const bytes=randomBytes(20);let bits=0,value=0,out='';for(const b of bytes){value=(value<<8)|b;bits+=8;while(bits>=5){out+=alphabet[(value>>>(bits-5))&31];bits-=5;}}return out;}
function decode(s){let bits=0,value=0,out=[];for(const c of s){const n=alphabet.indexOf(c);if(n<0)throw new Error('Invalid TOTP secret');value=(value<<5)|n;bits+=5;if(bits>=8){out.push((value>>>(bits-8))&255);bits-=8;}}return Buffer.from(out);}
export function otp(s,counter){const b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(counter));const mac=createHmac('sha1',decode(s)).update(b).digest();const offset=mac[mac.length-1]&15;return String((mac.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');}
export function verifyOtp(s,code,last=-1,now=Date.now()){if(!/^\d{6}$/.test(code||''))return null;const counter=Math.floor(now/30000);for(const c of [counter-1,counter,counter+1])if(c>Number(last??-1)&&timingSafeEqual(Buffer.from(otp(s,c)),Buffer.from(code)))return c;return null;}
function key(){const hex=process.env.MFA_ENCRYPTION_KEY;if(!hex||!/^[a-f0-9]{64}$/i.test(hex))throw new Error('MFA_ENCRYPTION_KEY kerak');return Buffer.from(hex,'hex');}
export function encryptionReady(){try{key();return true;}catch{return false;}}
export function encrypt(s){const iv=randomBytes(12);const c=createCipheriv('aes-256-gcm',key(),iv);const encrypted=Buffer.concat([c.update(s,'utf8'),c.final()]);return [iv.toString('hex'),c.getAuthTag().toString('hex'),encrypted.toString('hex')].join('.');}
export function decrypt(value){const [iv,tag,data]=value.split('.');const d=createDecipheriv('aes-256-gcm',key(),Buffer.from(iv,'hex'));d.setAuthTag(Buffer.from(tag,'hex'));return Buffer.concat([d.update(Buffer.from(data,'hex')),d.final()]).toString('utf8');}
