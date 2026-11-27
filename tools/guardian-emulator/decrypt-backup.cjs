const fs = require("node:fs");
const { createDecipheriv, createHash } = require("node:crypto");
const path = require("node:path");

const input = path.resolve(process.argv[2] || "../../security/backups/firestore-rules-20261126.enc");
const output = path.resolve(process.argv[3] || "firestore.rules.local");
const keyHex = process.env.GUARDIAN_RULES_BACKUP_KEY?.trim();
if (!/^[a-f0-9]{64}$/i.test(keyHex || "")) throw new Error("GUARDIAN_RULES_BACKUP_KEY must be supplied securely as 256-bit hex.");

const fields = Object.fromEntries(fs.readFileSync(input, "utf8").split(/\r?\n/).filter(Boolean).map((line) => {
  const index = line.indexOf("=");
  return [line.slice(0, index), line.slice(index + 1)];
}));
const pack = JSON.parse(Buffer.from(fields.ciphertext, "base64url").toString("utf8"));
const decipher = createDecipheriv("aes-256-gcm", Buffer.from(keyHex, "hex"), Buffer.from(pack.iv, "base64url"));
decipher.setAuthTag(Buffer.from(pack.tag, "base64url"));
const payload = JSON.parse(Buffer.concat([decipher.update(Buffer.from(pack.data, "base64url")), decipher.final()]).toString("utf8"));
const source = payload.files.map((file) => file.content || "").join("\n");
const digest = createHash("sha256").update(source).digest("hex");
if (!digest.startsWith(fields.source_sha256_prefix)) throw new Error("Decrypted Ruleset hash does not match the encrypted backup metadata.");
fs.writeFileSync(output, source, { mode: 0o600 });
console.log(JSON.stringify({ decrypted: true, files: payload.files.length, lines: source.split(/\r?\n/).length, sourceSha256Prefix: fields.source_sha256_prefix, identityExposed: false }));
