#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const appRoot = path.join(root, "app");
const requireZero = process.argv.includes("--require-zero");
const extensions = new Set([".js", ".jsx", ".ts", ".tsx"]);
const ignoredSegments = new Set(["node_modules", ".next", "����"]);

const files = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredSegments.has(entry.name)) walk(fullPath);
      continue;
    }
    if (extensions.has(path.extname(entry.name))) files.push(fullPath);
  }
};

walk(appRoot);

const directAccessPattern = /(?:collection|doc)\s*\(\s*(?:db\s*,\s*)?["'`]students["'`]|collection\s*\(\s*db\s*,\s*collectionName\s*\)|COLLECTION_NAMES\s*=\s*\[[^\]]*["'`]students["'`]/s;
const findings = files
  .filter((file) => {
    const source = fs.readFileSync(file, "utf8");
    return source.includes("firebase/firestore") && directAccessPattern.test(source);
  })
  .map((file) => path.relative(root, file).split(path.sep).join("/"))
  .sort();

const report = {
  directClientFileCount: findings.length,
  directClientFiles: findings,
  deployGatePassed: findings.length === 0,
};

console.log(JSON.stringify(report, null, 2));
if (requireZero && findings.length > 0) process.exitCode = 1;

