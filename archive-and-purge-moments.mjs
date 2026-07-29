// One-off operational script: archive every video out of the R2 `moments` bucket
// to a local folder, byte-verify each against R2's ETag, then delete the verified
// ones from the bucket. When purging, a janitor pass also sweeps orphaned
// previews/ and thumbs/ objects (previews only after a 7-day grace so in-flight
// uploads survive) and scrubs featured.json, og.json, dims.json, and thumbs.json
// entries whose drop no longer exists. Photos are left untouched.
//
//   ARCHIVE_DIR=/Volumes/MyDrive/ftgu-archive node archive-and-purge-moments.mjs
//
// Env:
//   ARCHIVE_DIR  where files land (default ~/Movies/ftgu-archive)
//   PURGE        "false" to archive+verify only and skip deletion (default: delete)
//   CONCURRENCY  parallel transfers (default 3)
//
// Safe to re-run: already-verified files are skipped, nothing is deleted unless its
// local copy's ETag matches the bucket exactly.

import { readFileSync, readdirSync, statSync, existsSync, mkdirSync, renameSync, copyFileSync, unlinkSync, createReadStream, createWriteStream, openSync, readSync, closeSync } from "node:fs";
import { createHash } from "node:crypto";
import { pipeline } from "node:stream/promises";
import { join, basename } from "node:path";
import { homedir } from "node:os";
import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const env = Object.fromEntries(
  readFileSync("./.env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; }),
);
const s3 = new S3Client({
  region: "auto", endpoint: env.S3_ENDPOINT,
  credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
  forcePathStyle: env.S3_FORCE_PATH_STYLE === "true",
});
const BUCKET = env.S3_BUCKET;

const ARCHIVE_DIR = process.env.ARCHIVE_DIR || join(homedir(), "Movies", "ftgu-archive");
const PURGE = process.env.PURGE !== "false";
const CONCURRENCY = Number(process.env.CONCURRENCY) || 3;
const VIDEO_EXT = /\.(mp4|mov|m4v|webm|ogg)$/i;
const PART = 8 * 1024 * 1024;            // server's DEFAULT_PART, deterministic for these sizes
const g = (b) => (b / 1e9).toFixed(2) + " GB";

// --- ETag verification (matches S3/R2 convention) ---
function md5File(file) {
  return new Promise((res, rej) => {
    const h = createHash("md5");
    createReadStream(file).on("data", (d) => h.update(d)).on("end", () => res(h.digest("hex"))).on("error", rej);
  });
}
function multipartEtag(file, partCount) {
  const fd = openSync(file, "r");
  try {
    const buf = Buffer.allocUnsafe(PART);
    const digests = [];
    let pos = 0, read;
    while ((read = readSync(fd, buf, 0, PART, pos)) > 0) {
      digests.push(createHash("md5").update(buf.subarray(0, read)).digest());
      pos += read;
    }
    const combined = createHash("md5").update(Buffer.concat(digests)).digest("hex");
    return `${combined}-${digests.length}` + (digests.length === partCount ? "" : `(parts=${digests.length}!=${partCount})`);
  } finally { closeSync(fd); }
}
async function verify(file, etag, size) {
  if (!existsSync(file) || statSync(file).size !== size) return false;
  const e = etag.replace(/"/g, "");
  if (/^[a-f0-9]{32}$/.test(e)) return (await md5File(file)) === e;
  const m = e.match(/^[a-f0-9]{32}-(\d+)$/);
  if (m) return multipartEtag(file, Number(m[1])) === e;
  return false; // unrecognized etag form -> refuse to treat as verified
}

// --- 1. list videos ---
let token; const vids = [];
do {
  const res = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, ContinuationToken: token }));
  for (const o of res.Contents ?? []) if (o.Key.startsWith("drops/") && VIDEO_EXT.test(o.Key))
    vids.push({ key: o.Key, size: o.Size ?? 0, etag: (o.ETag || "").replace(/"/g, "") });
  token = res.IsTruncated ? res.NextContinuationToken : undefined;
} while (token);
vids.sort((a, b) => b.size - a.size);

// --- 2. index Downloads for reusable copies (avoid re-downloading) ---
const sizeSet = new Set(vids.map((v) => v.size));
const bySize = new Map();
(function walk(dir) {
  let entries; try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (e.isFile() && sizeSet.has(statSync(p).size)) { if (!bySize.has(statSync(p).size)) bySize.set(statSync(p).size, []); bySize.get(statSync(p).size).push(p); }
  }
})(join(homedir(), "Downloads"));

mkdirSync(ARCHIVE_DIR, { recursive: true });
console.log(`archive dir : ${ARCHIVE_DIR}`);
console.log(`videos      : ${vids.length} (${g(vids.reduce((s, v) => s + v.size, 0))})`);
console.log(`purge after : ${PURGE ? "YES (delete verified from R2)" : "no (archive only)"}\n`);

const out = { reused: [], downloaded: [], skipped: [], deleted: [], failed: [] };
let i = 0, freed = 0;

async function handle(v) {
  const dest = join(ARCHIVE_DIR, basename(v.key));
  const short = basename(v.key).slice(0, 28);
  try {
    if (await verify(dest, v.etag, v.size)) {
      out.skipped.push(v.key);
    } else {
      let got = false;
      for (const c of (bySize.get(v.size) || [])) {
        if (c !== dest && await verify(c, v.etag, v.size)) { copyFileSync(c, dest); out.reused.push(v.key); got = true; break; }
      }
      if (!got) {
        const tmp = dest + ".part";
        const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: v.key }));
        await pipeline(res.Body, createWriteStream(tmp));
        if (!(await verify(tmp, v.etag, v.size))) { try { unlinkSync(tmp); } catch {} throw new Error("ETag mismatch after download"); }
        renameSync(tmp, dest);
        out.downloaded.push(v.key);
      }
    }
    if (PURGE) {
      if (await verify(dest, v.etag, v.size)) {
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: v.key }));
        out.deleted.push(v.key); freed += v.size;
      } else throw new Error("refused to delete: dest failed verify");
    }
    console.log(`[${String(++i).padStart(2)}/${vids.length}] ok   ${(v.size/1e6).toFixed(0).padStart(5)}MB ${short}`);
  } catch (err) {
    out.failed.push({ key: v.key, error: String(err.message || err) });
    console.log(`[${String(++i).padStart(2)}/${vids.length}] FAIL ${short}  ${err.message || err}`);
  }
}

let n = 0;
await Promise.all(Array.from({ length: CONCURRENCY }, async () => { while (n < vids.length) await handle(vids[n++]); }));

// --- 3. janitor: purge preview/thumb orphans and scrub stale index entries ---
const janitor = { orphans: 0, scrubbed: 0 };
if (PURGE) {
  const drops = new Set(); const previews = []; const thumbnails = [];
  let jt;
  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, ContinuationToken: jt }));
    for (const o of res.Contents ?? []) {
      if (o.Key.startsWith("drops/") && o.Key !== "drops/") drops.add(o.Key);
      else if (o.Key.startsWith("previews/") && o.Key !== "previews/") previews.push(o);
      else if (o.Key.startsWith("thumbs/") && o.Key !== "thumbs/") thumbnails.push(o);
    }
    jt = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (jt);

  const base = (k) => k.replace(/^(drops|previews|thumbs)\//, "").replace(/\.[^./]+$/, "");
  const dropBases = new Set([...drops].map(base));
  const GRACE = 7 * 24 * 3600 * 1000;
  const orphans = [
    ...previews.filter((o) => !dropBases.has(base(o.Key)) && Date.now() - (o.LastModified?.getTime() ?? 0) > GRACE),
    ...thumbnails.filter((o) => !dropBases.has(base(o.Key))),
  ];
  for (const o of orphans) {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: o.Key }));
    console.log(`janitor: deleted orphan ${o.Key}`);
    janitor.orphans++;
  }

  const getJson = async (key) => {
    try {
      const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
      return JSON.parse(await res.Body.transformToString());
    } catch { return null; }
  };
  const putJson = (key, value) =>
    s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: JSON.stringify(value), ContentType: "application/json" }));

  const featured = await getJson("featured.json");
  if (Array.isArray(featured)) {
    const kept = featured.filter((k) => drops.has(k));
    if (kept.length !== featured.length) {
      await putJson("featured.json", kept);
      console.log(`janitor: featured.json ${featured.length} -> ${kept.length}`);
      janitor.scrubbed += featured.length - kept.length;
    }
  }
  const og = await getJson("og.json");
  if (typeof og === "string" && og.startsWith("drops/") && !drops.has(og)) {
    await putJson("og.json", null);
    console.log("janitor: og.json cleared (drop gone)");
    janitor.scrubbed++;
  }
  for (const name of ["dims.json", "thumbs.json"]) {
    const index = await getJson(name);
    if (!index || typeof index !== "object" || Array.isArray(index)) continue;
    const stale = Object.keys(index).filter((k) => !drops.has(k));
    if (stale.length) {
      for (const k of stale) delete index[k];
      await putJson(name, index);
      console.log(`janitor: ${name} removed ${stale.length} stale entries`);
      janitor.scrubbed += stale.length;
    }
  }
}

console.log("\n================ SUMMARY ================");
console.log(`downloaded : ${out.downloaded.length}`);
console.log(`reused (Downloads copy) : ${out.reused.length}`);
console.log(`already archived (skipped) : ${out.skipped.length}`);
console.log(`deleted from R2 : ${out.deleted.length}  (freed ${g(freed)})`);
console.log(`janitor orphans deleted : ${janitor.orphans}`);
console.log(`janitor index entries scrubbed : ${janitor.scrubbed}`);
console.log(`FAILED : ${out.failed.length}`);
for (const f of out.failed) console.log(`   - ${f.key}: ${f.error}`);
if (out.failed.length) console.log("\nFailures were NOT deleted from R2. Re-run to retry.");
