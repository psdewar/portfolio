// Client-side upload for the /moments page. Speaks the S3 API, so the same code
// works against Cloudflare R2 (prod), MinIO (dev / NAS), or any S3-compatible
// backend. Files are uploaded untouched — large ones are sliced into parts via
// S3/R2 multipart so multi-GB originals survive flaky mobile connections.
//
// R2 CORS must allow PUT from the site origin AND expose the ETag header
// (ExposeHeaders: ["ETag"]) — multipart completion reads each part's ETag.
//
// Required server-side env vars (see app/api/moments/sign + multipart routes):
//   S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET,
//   S3_FORCE_PATH_STYLE, MOMENTS_PASSCODE

import exifr from "exifr";

export type UploadMeta = {
  passcode: string;
};

export type UploadResult = {
  key: string;
  duplicate?: boolean;
};

const SINGLE_PART_MAX = 16 * 1024 * 1024;
const PART_CONCURRENCY = 5;
const MAX_ATTEMPTS = 4;

class PermanentError extends Error {}
class CancelledError extends PermanentError {
  constructor() {
    super("Upload cancelled");
    this.name = "CancelledError";
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function backoffMs(attempt: number) {
  return Math.min(1000 * 2 ** attempt, 15000) + Math.floor(Math.random() * 500);
}

function isPermanent(status: number) {
  return status >= 400 && status < 500 && status !== 408 && status !== 429;
}

function httpError(status: number, message: string) {
  return isPermanent(status) ? new PermanentError(message) : new Error(message);
}

const HASH_FULL_MAX = 16 * 1024 * 1024;
const FINGERPRINT_CHUNK = 8 * 1024 * 1024;

async function sha256Hex(bytes: BufferSource): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function captureMeta(
  file: File,
): Promise<{ hash: string; captured: number } | undefined> {
  if (!file.type.startsWith("image/")) return undefined;
  try {
    const exif = await exifr.parse(file);
    const taken = exif?.DateTimeOriginal ?? exif?.CreateDate;
    const capturedMs =
      taken instanceof Date ? taken.getTime() : taken ? Date.parse(taken) : NaN;
    if (!Number.isFinite(capturedMs)) return undefined;
    const subsec = exif?.SubSecTimeOriginal ?? "";
    const w = exif?.ExifImageWidth ?? exif?.ImageWidth ?? 0;
    const h = exif?.ExifImageHeight ?? exif?.ImageHeight ?? 0;
    const id = `${capturedMs}.${subsec}|${w}x${h}|${exif?.Make ?? ""}|${exif?.Model ?? ""}`;
    return {
      hash: await sha256Hex(new TextEncoder().encode(id)),
      captured: capturedMs,
    };
  } catch {
    return undefined;
  }
}

async function fingerprint(
  file: File,
): Promise<{ hash: string; captured?: number } | undefined> {
  const capture = await captureMeta(file);
  if (capture) return capture;
  try {
    let bytes: Uint8Array;
    if (file.size <= HASH_FULL_MAX) {
      bytes = new Uint8Array(await file.arrayBuffer());
    } else {
      const head = new Uint8Array(
        await file.slice(0, FINGERPRINT_CHUNK).arrayBuffer(),
      );
      const tail = new Uint8Array(
        await file.slice(file.size - FINGERPRINT_CHUNK).arrayBuffer(),
      );
      const sizeTag = new TextEncoder().encode(`:${file.size}`);
      bytes = new Uint8Array(head.length + tail.length + sizeTag.length);
      bytes.set(head, 0);
      bytes.set(tail, head.length);
      bytes.set(sizeTag, head.length + tail.length);
    }
    return { hash: await sha256Hex(bytes) };
  } catch {
    return undefined;
  }
}

const STORE_KEY = "moments-uploads";
const RECORD_TTL = 7 * 24 * 60 * 60 * 1000;

type UploadRecord = {
  key: string;
  uploadId: string;
  partSize: number;
  name: string;
  size: number;
  lastModified: number;
  createdAt: number;
};

function loadRecords(): UploadRecord[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (r) =>
        r && typeof r.createdAt === "number" && Date.now() - r.createdAt < RECORD_TTL,
    );
  } catch {
    return [];
  }
}

function saveRecords(records: UploadRecord[]) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(records));
  } catch {
    // storage unavailable; resume just won't persist across reloads
  }
}

function putRecord(record: UploadRecord) {
  saveRecords([...loadRecords().filter((r) => r.key !== record.key), record]);
}

function dropRecord(key: string) {
  saveRecords(loadRecords().filter((r) => r.key !== key));
}

function matchRecord(file: File): UploadRecord | undefined {
  return loadRecords().find(
    (r) =>
      r.name === file.name &&
      r.size === file.size &&
      r.lastModified === file.lastModified,
  );
}

function putXhr(
  url: string,
  body: Blob,
  contentType: string | undefined,
  onProgress: (loaded: number) => void,
  signal?: AbortSignal,
): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new CancelledError());
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    if (contentType) xhr.setRequestHeader("Content-Type", contentType);
    const onAbort = () => xhr.abort();
    signal?.addEventListener("abort", onAbort, { once: true });
    const cleanup = () => signal?.removeEventListener("abort", onAbort);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded);
    };
    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.getResponseHeader("ETag") || undefined);
      } else {
        reject(httpError(xhr.status, `Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => {
      cleanup();
      reject(new Error("Network error during upload"));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new CancelledError());
    };
    xhr.send(body);
  });
}

async function postAction(payload: Record<string, unknown>, fallbackError: string) {
  const res = await fetch("/api/moments/multipart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw httpError(res.status, data.error || fallbackError);
  }
  return res.json();
}

async function uploadSingle(
  file: File,
  meta: UploadMeta,
  onProgress: (percent: number) => void,
  signal?: AbortSignal,
): Promise<UploadResult> {
  const fp = await fingerprint(file);
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      onProgress(0);
      const contentType = file.type || "application/octet-stream";
      const signRes = await fetch("/api/moments/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passcode: meta.passcode,
          filename: file.name,
          contentType,
          hash: fp?.hash,
          captured: fp?.captured,
          size: file.size,
        }),
      });
      if (!signRes.ok) {
        const data = await signRes.json().catch(() => ({}));
        throw httpError(signRes.status, data.error || "Could not get upload URL");
      }
      const data = (await signRes.json()) as {
        url?: string;
        key: string;
        exists?: boolean;
      };
      if (data.exists) {
        onProgress(100);
        return { key: data.key, duplicate: true };
      }
      if (!data.url) throw new Error("No upload URL returned");
      await putXhr(
        data.url,
        file,
        contentType,
        (loaded) => onProgress((loaded / file.size) * 100),
        signal,
      );
      onProgress(100);
      return { key: data.key };
    } catch (err) {
      lastError = err;
      if (err instanceof PermanentError) throw err;
      if (attempt < MAX_ATTEMPTS - 1) await sleep(backoffMs(attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Upload failed");
}

async function uploadMultipart(
  file: File,
  meta: UploadMeta,
  onProgress: (percent: number) => void,
  signal?: AbortSignal,
): Promise<UploadResult> {
  const existing = matchRecord(file);
  let key: string;
  let uploadId: string;
  let partSize: number;
  let partUrls: string[];
  let uploadedParts: Array<{ partNumber: number; etag: string }> = [];

  if (existing) {
    const res = await fetch("/api/moments/multipart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "resume",
        passcode: meta.passcode,
        key: existing.key,
        uploadId: existing.uploadId,
        size: file.size,
      }),
    });
    if (res.status === 410) {
      dropRecord(existing.key);
      return uploadMultipart(file, meta, onProgress);
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw httpError(res.status, data.error || "Could not resume upload");
    }
    const data = await res.json();
    key = existing.key;
    uploadId = existing.uploadId;
    partSize = data.partSize;
    partUrls = data.partUrls;
    uploadedParts = Array.isArray(data.uploadedParts) ? data.uploadedParts : [];
  } else {
    const fp = await fingerprint(file);
    const data = (await postAction(
      {
        action: "create",
        passcode: meta.passcode,
        filename: file.name,
        contentType: file.type,
        hash: fp?.hash,
        captured: fp?.captured,
        size: file.size,
      },
      "Could not start upload",
    )) as {
      key: string;
      uploadId?: string;
      partSize?: number;
      partUrls?: string[];
      exists?: boolean;
    };
    if (data.exists) {
      onProgress(100);
      return { key: data.key, duplicate: true };
    }
    key = data.key;
    uploadId = data.uploadId!;
    partSize = data.partSize!;
    partUrls = data.partUrls!;
    putRecord({
      key,
      uploadId,
      partSize,
      name: file.name,
      size: file.size,
      lastModified: file.lastModified,
      createdAt: Date.now(),
    });
  }

  const total = file.size;
  const loaded = new Array(partUrls.length).fill(0);
  const parts = new Array<{ partNumber: number; etag: string }>(partUrls.length);
  const done = new Set<number>();
  for (const p of uploadedParts) {
    const idx = p.partNumber - 1;
    if (idx >= 0 && idx < partUrls.length) {
      parts[idx] = { partNumber: p.partNumber, etag: p.etag };
      loaded[idx] = Math.min((idx + 1) * partSize, total) - idx * partSize;
      done.add(idx);
    }
  }
  const report = () =>
    onProgress((loaded.reduce((a, b) => a + b, 0) / total) * 100);
  report();

  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= partUrls.length) return;
      if (done.has(i)) continue;
      const start = i * partSize;
      const end = Math.min(start + partSize, total);
      const blob = file.slice(start, end);

      let etag: string | undefined;
      let lastError: unknown;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        try {
          etag = await putXhr(
            partUrls[i],
            blob,
            undefined,
            (l) => {
              loaded[i] = l;
              report();
            },
            signal,
          );
          break;
        } catch (err) {
          lastError = err;
          loaded[i] = 0;
          report();
          if (err instanceof PermanentError) throw err;
          if (attempt === MAX_ATTEMPTS - 1) throw lastError;
          await sleep(backoffMs(attempt));
        }
      }
      if (!etag) {
        throw new Error("Missing ETag: R2 CORS must expose the ETag header");
      }
      loaded[i] = end - start;
      report();
      parts[i] = { partNumber: i + 1, etag };
    }
  }

  try {
    await Promise.all(
      Array.from({ length: Math.min(PART_CONCURRENCY, partUrls.length) }, worker),
    );
    await postAction(
      { action: "complete", passcode: meta.passcode, key, uploadId, parts },
      "Could not finish upload",
    );
    dropRecord(key);
    onProgress(100);
    return { key };
  } catch (err) {
    if (err instanceof PermanentError) {
      await postAction(
        { action: "abort", passcode: meta.passcode, key, uploadId },
        "abort failed",
      ).catch(() => {});
      dropRecord(key);
    }
    throw err;
  }
}

export async function uploadFile(
  file: File,
  meta: UploadMeta,
  onProgress: (percent: number) => void,
  signal?: AbortSignal,
): Promise<UploadResult> {
  if (
    process.env.NODE_ENV !== "production" &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("fail")
  ) {
    onProgress(15);
    await sleep(500);
    throw new Error("Simulated failure (remove ?fail to upload for real)");
  }
  if (file.size <= SINGLE_PART_MAX)
    return uploadSingle(file, meta, onProgress, signal);
  return uploadMultipart(file, meta, onProgress, signal);
}
