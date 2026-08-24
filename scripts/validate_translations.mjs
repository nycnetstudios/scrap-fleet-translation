#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const placeholderPattern = /\{[^{}]+\}|%(?:\d+\$)?[sdif]/g;
const localePattern = /^(template|[a-z]{2,3}(?:_[A-Z]{2})?)\.csv$/;

function parseCsv(filePath) {
  const text = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += char;
  }
  if (quoted) throw new Error("unclosed quoted field");
  if (field !== "" || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  return rows.filter((entry) => entry.some((value) => value !== ""));
}

function placeholders(value) {
  return [...value.matchAll(placeholderPattern)].map((match) => match[0]).sort();
}

function sameArray(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

const errors = [];
const sourcePath = path.join(root, "reference", "source.csv");
const sourceRows = parseCsv(sourcePath);
if (!sameArray(sourceRows.shift() ?? [], ["key", "en"])) errors.push(`${sourcePath}: expected header key,en`);
const sourceOrder = sourceRows.map((row) => row[0]?.trim() ?? "");
const source = new Map(sourceRows.map((row) => [row[0]?.trim() ?? "", row[1] ?? ""]));
if (source.size !== sourceOrder.length) errors.push(`${sourcePath}: duplicate keys`);

const translationDir = path.join(root, "translations");
const files = fs.readdirSync(translationDir).filter((name) => name.endsWith(".csv")).sort();
for (const name of files) {
  const filePath = path.join(translationDir, name);
  if (!localePattern.test(name)) errors.push(`${filePath}: invalid locale filename`);
  const rows = parseCsv(filePath);
  if (!sameArray(rows.shift() ?? [], ["key", "en", "translation"])) {
    errors.push(`${filePath}: expected header key,en,translation`);
    continue;
  }
  const seen = new Set();
  const order = [];
  rows.forEach((row, index) => {
    const line = index + 2;
    const key = row[0]?.trim() ?? "";
    const english = row[1] ?? "";
    const translation = row[2] ?? "";
    if (!key) errors.push(`${filePath}:${line}: empty key`);
    if (seen.has(key)) errors.push(`${filePath}:${line}: duplicate key ${key}`);
    seen.add(key); order.push(key);
    if (!source.has(key)) errors.push(`${filePath}:${line}: unknown key ${key}`);
    else if (english !== source.get(key)) errors.push(`${filePath}:${line}: English reference changed for ${key}`);
    if (translation.includes("\n") || translation.includes("\r")) errors.push(`${filePath}:${line}: use literal \\n instead of a physical line break`);
    if (translation && !sameArray(placeholders(translation), placeholders(english))) errors.push(`${filePath}:${line}: placeholders differ for ${key}`);
  });
  const missing = sourceOrder.filter((key) => !seen.has(key));
  if (missing.length) errors.push(`${filePath}: missing ${missing.length} keys: ${missing.slice(0, 8).join(", ")}`);
  if (!sameArray(order, sourceOrder)) errors.push(`${filePath}: keys must keep the same order as reference/source.csv`);
}

if (errors.length) {
  errors.forEach((error) => console.error(`ERROR: ${error}`));
  process.exit(1);
}
console.log(`TRANSLATION_VALIDATION_OK:${files.length} files:${sourceOrder.length} keys`);
