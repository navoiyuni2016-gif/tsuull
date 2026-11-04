import {calculationDocument} from './print-document.mjs';
import {languages} from '../public/i18n.mjs';
import {createHash,randomUUID} from 'node:crypto';
import {transaction,audit} from './db.mjs';
import {visible} from './scopes.mjs';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const error=(status,message)=>Object.assign(new Error(message),{status});
export async function saveCalculation(pool,req,{kind,input,result,sources=[]}){
 const requestId=req.get('X-Calculation-Request-ID')||randomUUID();
 if(!uuid(requestId))throw error(400,'Hisoblash so‘rovi identifikatori noto‘g‘ri.');
 const inputHash=createHash('sha256').update(JSON.stringify({kind,input})).digest('hex');
 const frozen=sources.map(r=>({id:r.id,module:r.module,code:r.code,revision:r.revision,status:r.status,source_id:r.source_id,author_id:r.author_id,approved_by:r.approved_by,data:r.data}));
 const row=await transaction(pool,async c=>{
  const saved=await c.query('INSERT INTO portal.calculation_runs(actor_id,request_id,kind,input_hash,input,result,sources,actor_name,actor_role) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(actor_id,request_id) DO NOTHING RETURNING *',[req.user.id,requestId,kind,inputHash,JSON.stringify(input),JSON.stringify(result),JSON.stringify(frozen),req.user.name,req.user.role]);
  if(saved.rows[0]){await audit(c,req.user.id,'CALCULATION_SAVED',saved.rows[0].id,{kind,requestId});return saved.rows[0];}
  const existing=(await c.query('SELECT * FROM portal.calculation_runs WHERE actor_id=$1 AND request_id=$2',[req.user.id,requestId])).rows[0];
  if(existing.input_hash!==inputHash)throw error(409,'Takroriy so‘rov parametrlari o‘zgargan.');
  return existing;
 });
 return {...row.result,history:{id:row.id,createdAt:row.created_at,kind:row.kind}};
}
export function registerCalculationHistory(app,{pool,fail,allRecords}){
 async function scope(req){
  const all=await allRecords(pool),ids=all.filter(r=>visible(r,req.user,all)).map(r=>r.id);
  return {where:"(actor_id=$1 OR $2::boolean) AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(sources) s WHERE NOT ((s->>'id')=ANY($3::text[])))",params:[req.user.id,req.user.role==='ADMIN',ids]};
 }
 app.get('/api/calculations',async(req,res)=>{
  const {where,params}=await scope(req),offset=Number(req.query.offset||0);
  if(!Number.isSafeInteger(offset)||offset<0||offset>100000)fail(400,'Sahifa parametri noto‘g‘ri.');
  let filter=where;if(req.query.kind){if(!['SIMULATION','RULE_BASED'].includes(req.query.kind))fail(400,'Hisoblash turi noto‘g‘ri.');params.push(req.query.kind);filter+=' AND kind=$'+params.length;}
  const total=Number((await pool.query('SELECT count(*) FROM portal.calculation_runs WHERE '+filter,params)).rows[0].count);
  params.push(offset);
  const items=(await pool.query('SELECT id,actor_id,actor_name,actor_role,kind,input,result,sources,created_at FROM portal.calculation_runs WHERE '+filter+' ORDER BY created_at DESC,id DESC LIMIT 50 OFFSET $'+params.length,params)).rows;
  res.json({items,total,nextOffset:offset+items.length<total?offset+items.length:null});
 });
 async function findRun(req){
  if(!uuid(req.params.id))fail(404,'Hisoblash yozuvi topilmadi.');
  const {where,params}=await scope(req);params.push(req.params.id);
  const row=(await pool.query('SELECT * FROM portal.calculation_runs WHERE '+where+' AND id=$'+params.length,params)).rows[0];
  if(!row)fail(404,'Hisoblash yozuvi topilmadi.');return row;
 }
 app.get('/api/calculations/:id',async(req,res)=>res.json(await findRun(req)));
 app.get('/api/calculations/:id/print',async(req,res)=>{
  const run=await findRun(req),lang=req.query.lang||'uz';
  if(!languages.some(l=>l.id===lang))fail(400,'Eksport formati yoki tili noto‘g‘ri.');
  const profile=(await pool.query('SELECT profile FROM portal.settings WHERE id=true')).rows[0]?.profile||{};
  res.type('html').send(calculationDocument({run,profile,lang}));
 });
}
