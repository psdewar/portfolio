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

export async function uploadFile(
  file: File,
  meta: UploadMeta,
  onProgress: (percent: number) => void,
): Promise<UploadResult> {
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
    throw new Error(data.error || "Could not get upload URL");
  }

  const { url } = (await signRes.json()) as { url: string; key: string };

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress((e.loaded / e.total) * 100);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (${xhr.status})`));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });

  return { url };
}
