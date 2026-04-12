// Client-side upload for the /moments page. Speaks the S3 API, so the same code
// works against Cloudflare R2 (prod), MinIO (dev / NAS), or any S3-compatible
// backend. Swapping backends = swapping env vars. See ADAPTERS.md for options.
//
// Required server-side env vars (used by app/api/moments/sign/route.ts):
//   S3_ENDPOINT              https://<account>.r2.cloudflarestorage.com (R2)
//                            or http://localhost:9000 (local MinIO)
//   S3_ACCESS_KEY_ID
//   S3_SECRET_ACCESS_KEY
//   S3_BUCKET                e.g. moments
//   S3_FORCE_PATH_STYLE      "true" for MinIO, omit/false for R2
//   MOMENTS_PASSCODE         the gate passcode

export type UploadMeta = {
  passcode: string;
};

export type UploadResult = {
  url: string;
};

const MAX_ATTEMPTS = 3;

class PermanentError extends Error {}

function backoffMs(attempt: number) {
  return Math.min(1000 * 2 ** attempt, 8000) + Math.floor(Math.random() * 500);
}

function isPermanent(status: number) {
  return status >= 400 && status < 500 && status !== 408 && status !== 429;
}

async function signUpload(file: File, meta: UploadMeta): Promise<string> {
  const signRes = await fetch("/api/moments/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      passcode: meta.passcode,
      filename: file.name,
      contentType: file.type,
      size: file.size,
    }),
  });
  if (!signRes.ok) {
    const data = await signRes.json().catch(() => ({}));
    const message = data.error || "Could not get upload URL";
    throw isPermanent(signRes.status) ? new PermanentError(message) : new Error(message);
  }
  const { url } = (await signRes.json()) as { url: string; key: string };
  return url;
}

function putFile(url: string, file: File, onProgress: (percent: number) => void): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress((e.loaded / e.total) * 100);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      const err = new Error(`Upload failed (${xhr.status})`);
      reject(isPermanent(xhr.status) ? new PermanentError(err.message) : err);
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
}

export async function uploadFile(
  file: File,
  meta: UploadMeta,
  onProgress: (percent: number) => void,
): Promise<UploadResult> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      onProgress(0);
      const url = await signUpload(file, meta);
      await putFile(url, file, onProgress);
      return { url };
    } catch (err) {
      lastError = err;
      if (err instanceof PermanentError) throw err;
      if (attempt < MAX_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, backoffMs(attempt)));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Upload failed");
}
