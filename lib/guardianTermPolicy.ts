// Confirmed school-specific policy for 2026 academic year Q4 only.
export function guardianExpectedLessonCount(slug:string,term:unknown):number|null {
  if(term!=="2026-Q4")return null;
  switch(slug){
    case "haneulbit": return 12;
    case "saesol": return 8;
    case "deunghyeon": return 10;
    case "sau": return 0;
    default: return null;
  }
}
export function guardianLessonCountMatches(slug:string,term:unknown,count:number):boolean {
  const expected=guardianExpectedLessonCount(slug,term);
  return Number.isInteger(count)&&count>=1&&count<=12&&(expected===null||count===expected);
}
export function guardianTermPaused(slug:string,term:unknown):boolean {
  return guardianExpectedLessonCount(slug,term)===0;
}
