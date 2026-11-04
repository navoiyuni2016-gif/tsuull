// Shared by table filters and exports so both select the same academic scope.
const indexes=new WeakMap();
export function recordDimensions(record,all){
 let map=indexes.get(all);if(!map){map=new Map(all.map(r=>[r.id,r]));indexes.set(all,map);}
 function locate(r,seen=new Set()){
  if(!r||seen.has(r.id))return {};seen.add(r.id);
  const own={department:r.module==='departments'?r.id:r.data.department,year:r.module==='years'?r.id:r.data.year};
  for(const key of ['workload','curriculum','teacher','group','subject']){
   if(!r.data[key])continue;const parent=locate(map.get(r.data[key]),new Set(seen));
   own.department ||= parent.department;own.year ||= parent.year;
  }
  return own;
 }
 return locate(record);
}
