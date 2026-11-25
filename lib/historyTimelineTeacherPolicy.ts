/** Pure allowlist/claim policy. Only a server-verified token may be passed to this helper. */
export function isTimelineTeacher(identity:{uid:string;teacher?:unknown},allowlist:string|undefined):boolean {
  return identity.teacher===true || (identity.uid.length>0 && (allowlist??"").split(",").map(s=>s.trim()).filter(Boolean).includes(identity.uid));
}
