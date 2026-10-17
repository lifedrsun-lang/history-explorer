import "server-only";
import { getFirebaseAdmin } from "./firebaseAdmin";

export async function verifiedTeacher(request: Request) {
  const match = (request.headers.get("authorization") || "").match(/^Bearer (.+)$/);
  if (!match) throw new Error("teacher_auth_required");
  const token = await getFirebaseAdmin().auth.verifyIdToken(match[1], true);
  const allowed = (process.env.STUDENT_AUTH_TEACHER_UIDS || "").split(",").map(value => value.trim()).filter(Boolean);
  // Email/password sign-in alone is not a teacher role. Unknown accounts fail closed.
  if (!allowed.includes(token.uid) || token.firebase?.sign_in_provider !== "password" || token.role === "student" || token.student === true) {
    throw new Error("teacher_auth_required");
  }
  return token;
}
