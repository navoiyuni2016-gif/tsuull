export const academicFields=[
 {key:'hoursPerCredit',label:'Bir kredit uchun akademik soat',type:'decimal',min:0.0001,max:1000},
 {key:'contactBasisPoints',label:'Auditoriya ulushi (basis point: 100%=10000)',type:'number',min:0,max:10000},
 ...[['lecture','Ma’ruza'],['practice','Amaliy'],['seminar','Seminar'],['lab','Laboratoriya'],['individual','Individual']].map(([key,label])=>({key:key+'BasisPoints',label:label+' ulushi (basis point)',type:'number',min:0,max:10000})),
 ...[['practiceGroupMax','Amaliy guruh sig‘imi'],['lectureStreamMax','Ma’ruza potogi sig‘imi'],['seminarGroupMax','Seminar guruhi sig‘imi'],['labGroupMax','Laboratoriya guruhi sig‘imi']].map(([key,label])=>({key,label,type:'number',min:1,max:10000})),
 {key:'individualUnit',label:'Individual mashg‘ulot ko‘paytirish birligi',type:'select',options:['PER_STUDENT','PER_GROUP']},
 {key:'roundingPlaces',label:'Yaxlitlash kasr xonalari (0–4)',type:'number',min:0,max:4},
 {key:'roundingMode',label:'Yaxlitlash usuli',type:'select',options:['HALF_UP','UP','DOWN']},
 {key:'remainderActivity',label:'Teng qoldiqda ustuvor mashg‘ulot',type:'select',options:['lecture','practice','seminar','lab','individual']},
 {key:'teacherAnnualLimit',label:'O‘qituvchi yillik tasdiqlangan limiti, soat',type:'decimal',min:0.0001,max:100000},
 {key:'termCreditLimit',label:'Semestr kredit limiti',type:'decimal',min:0.0001,max:1000},
 {key:'programCredits',label:'Dastur jami krediti',type:'decimal',min:0.0001,max:1000},
 {key:'termCount',label:'Dastur semestrlari soni',type:'number',min:1,max:20}
];
