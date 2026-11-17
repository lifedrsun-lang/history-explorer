import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const model = read("lib/goldenBingo.ts");
const server = read("lib/goldenBingoServer.ts");
const playRoute = read("app/api/teacher/golden-bingo/[gameId]/play/route.ts");
const playPage = read("app/teacher/golden-bingo/[gameId]/play/page.tsx");
const editor = read("app/teacher/golden-bingo/[gameId]/edit/page.tsx");
const list = read("app/teacher/golden-bingo/page.tsx");

assert.match(model, /GOLDEN_BINGO_MIN_QUESTIONS = 16/);
assert.match(model, /choices: \[string, string, string\]/);
assert.match(server, /completedNumbers: \[\]/);
assert.match(server, /export async function resetGoldenBingoProgress/);
assert.match(server, /export async function duplicateGoldenBingoGame/);

const hiddenQuestionPayload = server.match(/question: \{([\s\S]*?)\n\s*\},\n\s*\};/);
assert.ok(hiddenQuestionPayload, "진행 화면 문제 응답을 찾을 수 없습니다.");
assert.doesNotMatch(hiddenQuestionPayload[1], /correctChoice|explanation/);
assert.match(server, /export async function revealGoldenBingoAnswer/);
assert.match(playRoute, /body\.action === "reveal"/);
assert.match(playPage, /정답 확인/);
assert.match(playPage, /출제 완료 · 번호판으로/);
assert.match(playPage, /document\.documentElement\.requestFullscreen/);
assert.match(editor, /문제 이미지 첨부/);
assert.match(editor, /보기 3개와 정답/);
assert.match(list, /새 게임 만들기/);
assert.match(list, /게임 시작/);

console.log("golden-bingo verification passed");

