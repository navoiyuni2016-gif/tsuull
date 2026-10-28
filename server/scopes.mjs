const indexes=new WeakMap();
export function visible(record,user,all){
 if(!record)return false;
 if(!user.faculty_id&&!user.department_id&&!user.year_id)return true;
 let map=indexes.get(all);if(!map){map=new Map(all.map(r=>[r.id,r]));indexes.set(all,map);}
 function location(r,seen=new Set()){
  if(!r||seen.has(r.id))return {};seen.add(r.id);
  if(r.module==='faculties')return {faculty:r.id};
  if(r.module==='departments')return {department:r.id,faculty:r.data.faculty};
  if(r.data.department){const d=map.get(r.data.department);return {department:r.data.department,faculty:d?.data.faculty,year:r.data.year};}
  for(const k of ['curriculum','workload','teacher','group','subject'])if(r.data[k]){const result=location(map.get(r.data[k]),seen);if(result.department||result.faculty)return {...result,year:r.data.year||result.year};}
  return {year:r.module==='years'?r.id:r.data.year};
 }
 const loc=location(record);
 if(user.department_id){if(loc.department&&loc.department!==user.department_id)return false;const dep=map.get(user.department_id);if(loc.faculty&&loc.faculty!==dep?.data.faculty)return false;}
 if(user.faculty_id&&loc.faculty&&loc.faculty!==user.faculty_id)return false;
 if(user.year_id&&loc.year&&loc.year!==user.year_id)return false;
 return true;
}
export function scopedUserFields(u){return {id:u.id,email:u.email,name:u.name,role:u.role,faculty_id:u.faculty_id,department_id:u.department_id,year_id:u.year_id};}
