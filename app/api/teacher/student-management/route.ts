import { randomUUID } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { verifyStudentDataTeacherRequest } from "@/lib/studentDataTeacherAuth";
import { getEnrollmentStatus, getEnrollmentTerms } from "@/lib/studentEnrollment";
import { DEFAULT_STAGE_ID, STAGE_DATA, getStageInfo, getBookNumberFromStage } from "@/app/student/data/stageData";
import { STUDENT_PROGRAM_OPTIONS, getWorldCultureProgress, getStudentMaterialStageId, isWorldCultureProgram, isQuarterManagedProgram } from "@/lib/programs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (data: object, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
const text = (value: unknown) => typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
const num = (value: unknown) => { const n = Number(value || 0); return Number.isFinite(n) ? n : 0; };
const validId = (id: unknown): id is string => typeof id === "string" && id.length > 0 && id.length <= 150 && !id.includes("/") && id !== "." && id !== "..";
const statuses = ["active", "paused", "ended"];
const sourceLabels: Record<string,string> = { quiz: "퀴즈", homework: "과제", making: "만들기 완성", bonus: "선생님 보너스" };
const validTerm = (term: unknown): term is string => typeof term === "string" && /^\d{4}-Q[1-4]$/.test(term);
const validStage = (stage: unknown) => typeof stage === "string" && STAGE_DATA.some(item => item.id === stage);
const today = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const append = (history: unknown, items: Record<string,unknown>[]) => [...(Array.isArray(history) ? history : []), ...items.map(item => ({ id: randomUUID(), date: today(), createdAt: Timestamp.now(), ...item }))].slice(-100);

function createFields(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("invalid_input");
  const f = input as Record<string, unknown>;
  const school = text(f.school), name = text(f.name), grade = text(f.grade), className = text(f.class), studentNumber = text(f.studentNumber);
  const teachingClass = text(f.teachingClass), program = text(f.program), status = text(f.enrollmentStatus || "active");
  const stage = text(f.stage) || DEFAULT_STAGE_ID, worldCultureStage = text(f.worldCultureStage);
  const terms = f.enrollmentTerms === undefined ? [] : f.enrollmentTerms;
  if (!school || school.length > 100 || !name || name.length > 50 || grade.length > 20 || className.length > 20 || studentNumber.length > 20 ||
    !STUDENT_PROGRAM_OPTIONS.some(option => option.value === program) || !statuses.includes(status) ||
    !["", "A반", "B반"].includes(teachingClass) || !validStage(stage) ||
    (worldCultureStage && !getWorldCultureProgress(worldCultureStage)) ||
    !Array.isArray(terms) || terms.length > 20 || !terms.every(validTerm) ||
    (program !== "sun_lab" && (!grade || !className || !studentNumber || !teachingClass))) throw new Error("invalid_input");
  return { school, name, grade, class: className, studentNumber, password: studentNumber ? studentNumber.padStart(2,"0") : "", teachingClass,
    program, stage, worldCultureStage, enrollmentStatus: status, isActive: status === "active", enrollmentTerms: [...new Set(terms)].sort(),
    sunLabMember: f.sunLabMember === true, bronze: 0, silver: 0, totalBronze: 0, totalSilver: 0, timelineCompletedIssues: [], coinHistory: [], attendanceHistory: [], materialHistory: [] };
}

export async function POST(request: Request) {
  let teacher;
  try { teacher = await verifyStudentDataTeacherRequest(request); }
  catch { return json({ error: "teacher_forbidden" }, 403); }
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.action !== "string") return json({ error: "invalid_input" }, 400);
    const { db } = getFirebaseAdmin();
    const students = db.collection("students");
    if (body.action === "create") {
      const ref = await students.add({ ...createFields(body.fields), studentDataUpdatedBy: teacher.uid, studentDataUpdatedAt: Timestamp.now() });
      return json({ ok: true, studentId: ref.id }, 201);
    }
    if (!validId(body.studentId)) return json({ error: "invalid_input" }, 400);
    const ref = students.doc(body.studentId);
    if (body.action === "revealCode") {
      const snap = await ref.get();
      if (!snap.exists) return json({ error: "student_not_found" }, 404);
      const d = snap.data()!;
      return json({ code: text(d.password || d.studentPassword || d.pw) });
    }
    const result = await db.runTransaction(async tx => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) throw new Error("student_not_found");
      const student = snapshot.data()!;
      if (body.action === "delete") {
        tx.delete(ref.collection("serverCoinUndo").doc("latest"));
        tx.delete(ref);
        return { ok: true };
      }
      let changes: Record<string,unknown> = {};
      let exchangeCount = 0;
      switch(body.action) {
        case "coin": {
          const bronze = num(student.bronze), silver = num(student.silver), totalBronze = num(student.totalBronze), totalSilver = num(student.totalSilver);
          if (body.operation === "award") {
            const amount = body.amount;
            if (!Number.isInteger(amount) || amount < 1 || amount > 50 || typeof body.source !== "string" || !Object.prototype.hasOwnProperty.call(sourceLabels, body.source)) throw new Error("invalid_input");
            exchangeCount = Math.floor((bronze + amount) / 10);
            const items: Record<string, unknown>[] = [{type:"earn",currency:"bronze",amount,source:body.source,text:`동엽전 ${amount}개 획득 (${sourceLabels[body.source]})`}];
            if(exchangeCount>0) items.push({type:"exchange",fromCurrency:"bronze",fromAmount:10*exchangeCount,toCurrency:"silver",toAmount:exchangeCount,text:`동엽전 ${10*exchangeCount}개를 은엽전 ${exchangeCount}개로 자동 교환`});
            changes = {bronze:(bronze+amount)%10,silver:silver+exchangeCount,totalBronze:totalBronze+amount,totalSilver:totalSilver+exchangeCount,coinHistory:append(student.coinHistory,items)};
          } else if(body.operation==="remove"){
            if(bronze<=0)throw new Error("insufficient_balance");
            changes={bronze:bronze-1,totalBronze:Math.max(totalBronze-1,0),coinHistory:append(student.coinHistory,[{type:"adjust",currency:"bronze",amount:1,text:"동엽전 1개 회수"}])};
          } else if(body.operation==="use"){
            if(silver<=0)throw new Error("insufficient_balance");
            changes={silver:silver-1,coinHistory:append(student.coinHistory,[{type:"use",currency:"silver",amount:1,text:"은엽전 1개 사용"}])};
          } else throw new Error("invalid_input");
          tx.delete(ref.collection("serverCoinUndo").doc("latest"));
          break;
        }
        case "attendance":
          if (!["출석","결석(병가)","결석(체험학습)","지각"].includes(body.status)) throw new Error("invalid_input");
          changes={attendanceHistory:append(student.attendanceHistory,[{type:"attendance",status:body.status,text:body.status}])};
          break;
        case "material": {
          const world = isWorldCultureProgram(student.program);
          const worldProgress = getWorldCultureProgress(student.worldCultureStage);
          if(world && !worldProgress)throw new Error("invalid_input");
          const stageInfo=getStageInfo(student.stage);
          const materialName=world ? `모나르떼 ${worldProgress?.label}` : stageInfo.current?.short || `별꼼역사 ${getBookNumberFromStage(student.stage)}권`;
          changes={materialHistory:append(student.materialHistory,[{type:"material",materialName,stageId:getStudentMaterialStageId(student),stageTitle:world?worldProgress?.label||"":stageInfo.current?.title||"",text:`${materialName} 교재 지급`}])};
          break;
        }
        case "progress":
          if (body.worldCultureStage !== undefined) {
            if(!isWorldCultureProgram(student.program)||!getWorldCultureProgress(body.worldCultureStage))throw new Error("invalid_input");
            changes={worldCultureStage:body.worldCultureStage};
          } else {
            if(!validStage(body.stage)||isWorldCultureProgram(student.program))throw new Error("invalid_input");
            changes={stage:body.stage};
          }
          break;
        case "status":
          if(!statuses.includes(body.status))throw new Error("invalid_input");
          changes={enrollmentStatus:body.status,isActive:body.status==="active"};
          break;
        case "visibility":
          if(typeof body.active!=="boolean")throw new Error("invalid_input");
          changes={isActive:body.active,enrollmentStatus:body.active?"active":getEnrollmentStatus(student)==="ended"?"ended":"paused"};
          break;
        case "toggleTerm":
        case "assignTerm": {
          if(!validTerm(body.term)||!isQuarterManagedProgram(student.program))throw new Error("invalid_input");
          const current=getEnrollmentTerms(student);
          if(body.action==="assignTerm"&&current.length>0)throw new Error("term_already_assigned");
          const next=current.includes(body.term)?current.filter(term=>term!==body.term):[...current,body.term].sort();
          if(next.length>20)throw new Error("invalid_input");
          changes={enrollmentTerms:next};
          break;
        }
        default: throw new Error("invalid_input");
      }
      tx.update(ref,{...changes,studentDataUpdatedBy:teacher.uid,studentDataUpdatedAt:Timestamp.now()});
      return {ok:true,exchangeCount};
    });
    return json(result);
  } catch(error) {
    const code=error instanceof Error ? error.message : "";
    if(code==="invalid_input")return json({error:code},400);
    if(code==="student_not_found")return json({error:code},404);
    if(["insufficient_balance","term_already_assigned"].includes(code))return json({error:code},409);
    return json({error:"student_management_failed"},500);
  }
}
