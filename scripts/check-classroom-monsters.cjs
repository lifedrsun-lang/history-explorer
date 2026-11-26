// New classroom assignments are generated once at authoring time, never at login.
const fs = require("node:fs");
const path = require("node:path");
const { randomInt } = require("node:crypto");
const ts = require("typescript");

const allowed = ["slime", "orange-mushroom", "choco-mushroom", "blue-mushroom", "forest-mushroom"];
// Only these existing classrooms may retain the legacy guardian.
const legacyGuardian = new Set([
  "GAEBONG_SCHOOL_NAME:6:2", "WONJONG_SCHOOL_NAME:1:2",
  "GWANGIL_SCHOOL_NAME:5:2", "WOLMUN_SCHOOL_NAME:6:1",
]);

function readRooms(source) {
  const file = ts.createSourceFile("classroomData.ts", source, ts.ScriptTarget.Latest, true);
  const rooms = [];
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!/Classroom\[\]$/.test(declaration.type?.getText(file) || "")) continue;
      if (!declaration.initializer || !ts.isArrayLiteralExpression(declaration.initializer)) {
        throw new Error("Classroom declarations must use explicit persisted entries.");
      }
      for (const entry of declaration.initializer.elements) {
        if (!ts.isObjectLiteralExpression(entry)) throw new Error("Expected explicit classroom entry.");
        const get = (key) => {
          const p = entry.properties.find(p => ts.isPropertyAssignment(p) && p.name.getText(file) === key);
          if (!p) throw new Error("Missing classroom property: " + key);
          const v = p.initializer;
          if (ts.isStringLiteral(v) || ts.isNumericLiteral(v) || ts.isIdentifier(v)) return v.text;
          throw new Error("Classroom assignments must be fixed literals or identifiers.");
        };
        rooms.push({ school: get("schoolName"), grade: get("grade"), room: get("classNumber"), monster: get("monsterId") });
      }
    }
  }
  if (!rooms.length) throw new Error("No classroom declarations found.");
  return rooms;
}

function verify(rooms) {
  const used = new Map();
  const identities = new Set();
  for (const r of rooms) {
    const key = [r.school, r.grade, r.room].join(":");
    if (identities.has(key)) throw new Error("Duplicate classroom: " + key);
    identities.add(key);
    if (!allowed.includes(r.monster) && !(r.monster === "guardian-angel-slime" && legacyGuardian.has(key))) {
      throw new Error("Invalid new classroom monster: " + key);
    }
    const school = used.get(r.school) || new Set();
    if (school.has(r.monster)) throw new Error("Duplicate school monster: " + r.school);
    school.add(r.monster);
    used.set(r.school, school);
  }
  return used;
}

function assign(used, count, pick = randomInt) {
  const remaining = allowed.filter(id => !used.has(id));
  if (!Number.isSafeInteger(count) || count < 1 || count > remaining.length) {
    throw new Error("Not enough distinct allowed monsters; expand the credential scheme before adding more rooms.");
  }
  return Array.from({ length: count }, () => remaining.splice(pick(remaining.length), 1)[0]);
}

function selfTest() {
  const assert = require("node:assert/strict");
  const fixture = 'const X: SchoolClassroom[] = [{ schoolName: TEST, grade: 1, classNumber: 1, monsterId: "slime" }];';
  const rooms = readRooms(fixture);
  assert.equal(rooms.length, 1);
  const used = verify(rooms).get("TEST");
  const result = assign(used, 4, n => n - 1);
  assert.equal(new Set(result).size, 4);
  assert.ok(result.every(id => allowed.includes(id) && !used.has(id)));
  assert.throws(() => assign(used, 5));
  assert.throws(() => verify([...rooms, { ...rooms[0], room: "2" }]));
  assert.throws(() => verify([{ ...rooms[0], monster: "guardian-angel-slime" }]));
  assert.doesNotThrow(() => verify([{ school: "WONJONG_SCHOOL_NAME", grade: "1", room: "2", monster: "guardian-angel-slime" }]));
}

selfTest();
const source = fs.readFileSync(path.join(__dirname, "../app/student/data/classroomData.ts"), "utf8");
const used = verify(readRooms(source));
if (process.argv[2] === "--assign") {
  const school = process.argv[3];
  if (!school) throw new Error("Usage: npm run assign:classroom-monsters -- SCHOOL_NAME [count]");
  const count = Number(process.argv[4] || "1");
  console.log(JSON.stringify(assign(used.get(school) || new Set(), count)));
} else {
  console.log("Classroom monster policy and self-tests passed.");
}
