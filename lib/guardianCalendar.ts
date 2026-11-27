import { getAfterSchoolSchool, matchesAfterSchoolSchool } from "@/lib/afterSchool";
type Event = { id:string; summary:string; status:string; calendarType:string; start:{dateTime?:string} };
export type GuardianCalendarCandidate={eventId:string;date:string;start:string;title:string};
const localDate=(s:string)=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(s));
export function guardianCalendarCandidates(events:Event[],slug:string,term:string) {
 const school=getAfterSchoolSchool(slug);
 if(!school||!/^\d{4}-Q[1-4]$/.test(term))throw new Error("invalid_input");
 const quarter=Number(term.slice(-1));
 const classes:Record<"A반"|"B반",GuardianCalendarCandidate[]>={"A반":[],"B반":[]};
 const unmatched:GuardianCalendarCandidate[]=[];
 const seen=new Set<string>();
 for(const event of events){
  if(event.calendarType!=="afterSchool"||event.status!=="confirmed"||!event.start.dateTime||!event.id||seen.has(event.id))continue;
  const m=event.summary.match(/^(.+?초(?:등학교)?)\s*\/?\s*방과후\s+(.+)$/);
  if(!m||!matchesAfterSchoolSchool(m[1],school))continue;
  const course=m[2];const q=course.match(/([1-4])\s*분기\s*$/);
  if(!q||Number(q[1])!==quarter)continue;
  if(!Number.isFinite(Date.parse(event.start.dateTime)))continue;
  const title=course.slice(0,q.index).replace(/[☆★\s]+$/g,"").trim();
  const row={eventId:event.id,date:localDate(event.start.dateTime),start:event.start.dateTime,title:event.summary};
  let c:"A반"|"B반"|null=null;
  if(/A(?:반)?$/i.test(title))c="A반";
  else if(/B(?:반)?$/i.test(title))c="B반";
  else if(slug==="deunghyeon"&&title==="세계문화")c="A반";
  else if(slug==="deunghyeon"&&title==="한국사")c="B반";
  seen.add(event.id);
  if(c)classes[c].push(row);else unmatched.push(row);
 }
 for(const c of ["A반","B반"] as const)classes[c].sort((a,b)=>a.start.localeCompare(b.start));
 return {classes,unmatched};
}
