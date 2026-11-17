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
const duplicateRoute = read("app/api/teacher/golden-bingo/[gameId]/duplicate/route.ts");
const bingoModel = await import(new URL("../lib/goldenBingo.ts", import.meta.url));

const identityOrder = bingoModel.makeGoldenBingoBoardOrder(4, "classic");
assert.deepEqual(identityOrder, [1, 2, 3, 4]);
assert.deepEqual(
  bingoModel.normalizeGoldenBingoBoardOrder([4, 2, 1, 3], 4, "classic"),
  [4, 2, 1, 3]
);
assert.deepEqual(
  bingoModel.normalizeGoldenBingoBoardOrder([1, 1, 3, 4], 4, "classic"),
  identityOrder
);
const shuffledOrder = bingoModel.shuffleGoldenBingoBoardOrder(
  identityOrder,
  () => 0
);
assert.deepEqual([...shuffledOrder].sort((a, b) => a - b), identityOrder);
assert.notDeepEqual(shuffledOrder, identityOrder);
assert.deepEqual(
  bingoModel.shuffleGoldenBingoBoardOrder(
    identityOrder,
    (upperExclusive) => upperExclusive - 1
  ),
  [2, 1, 3, 4]
);

const specialOrder = bingoModel.makeGoldenBingoBoardOrder(20, "special25");
assert.equal(specialOrder.length, 25);
assert.equal(specialOrder.filter((entry) => entry === "miss").length, 3);
assert.equal(specialOrder.filter((entry) => entry === "retry").length, 2);
assert.equal(bingoModel.goldenBingoBoardCount(20, "special25"), 25);
const migratedSpecialOrder = bingoModel.normalizeGoldenBingoBoardOrder(
  Array.from({ length: 20 }, (_, index) => index + 1),
  20,
  "special25"
);
assert.equal(migratedSpecialOrder.length, 25);

const eraseOrder = bingoModel.makeGoldenBingoEraseNumberOrder(20, "special25");
assert.equal(eraseOrder.length, 20);
assert.equal(new Set(eraseOrder).size, 20);
assert.ok(eraseOrder.every((number) => number >= 1 && number <= 25));
const shuffledEraseOrder = bingoModel.shuffleGoldenBingoEraseNumberOrder(
  eraseOrder,
  20,
  "special25",
  () => 0
);
assert.equal(shuffledEraseOrder.length, 20);
assert.equal(new Set(shuffledEraseOrder).size, 20);
assert.ok(shuffledEraseOrder.every((number) => number >= 1 && number <= 25));

assert.match(model, /GOLDEN_BINGO_MIN_QUESTIONS = 16/);
assert.match(model, /choices: \[string, string, string\]/);
assert.match(model, /export const normalizeGoldenBingoBoardOrder/);
assert.match(model, /export const normalizeGoldenBingoEraseNumberOrder/);
assert.match(server, /completedNumbers: \[\]/);
assert.match(server, /export async function resetGoldenBingoProgress/);
assert.match(
  server,
  /questionOrder: shuffleGoldenBingoBoardOrder\(previousOrder, randomInt\)/
);
assert.match(server, /eraseNumberOrder: shuffleGoldenBingoEraseNumberOrder/);
assert.match(server, /special: \{ number, type: entry \}/);
assert.match(server, /eraseNumber: eraseNumberOrder\[entry - 1\]/);
assert.match(server, /questionForBoardNumber\(game, data, number\)/);
assert.match(server, /export async function duplicateGoldenBingoGame/);

const hiddenQuestionPayload = server.match(/question: \{([\s\S]*?)\n\s*\},\n\s*\};/);
assert.ok(hiddenQuestionPayload, "진행 화면 문제 응답을 찾을 수 없습니다.");
assert.doesNotMatch(hiddenQuestionPayload[1], /correctChoice|explanation/);
assert.doesNotMatch(hiddenQuestionPayload[1], /eraseNumber/);
assert.match(server, /export async function revealGoldenBingoAnswer/);
assert.match(playRoute, /body\.action === "reveal"/);
assert.match(playPage, /보기를 눌러 정답을 공개하세요/);
assert.match(playPage, /selectedWrong/);
assert.match(playPage, /onClick=\{\(\) => void revealAnswer\(choiceNumber\)\}/);
assert.match(playPage, /출제 완료 · 번호판으로/);
assert.match(playPage, /꽝!/);
assert.match(playPage, /한 번 더 도전!/);
assert.match(playPage, /정답! \{answer\.eraseNumber\}번을 지워주세요!/);
assert.match(playPage, /게임 초기화 · 문제 섞기/);
assert.match(playPage, /진행 기록을 초기화하고 문제 번호를 다시 섞을까요/);
assert.match(playPage, /document\.documentElement\.requestFullscreen/);
assert.match(editor, /문제 이미지 첨부/);
assert.match(editor, /보기 3개와 정답/);
assert.match(list, /새 게임 만들기/);
assert.match(list, /게임 시작/);
assert.match(list, /난이도 상 복제/);
assert.match(duplicateRoute, /playMode: options\.playMode/);

console.log("golden-bingo verification passed");

