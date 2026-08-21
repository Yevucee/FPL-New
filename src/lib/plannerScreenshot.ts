/** Reference screenshot upload limits and validation. */

export const SCREENSHOT_MAX_BYTES = 4 * 1024 * 1024; // 4 MB

export const SCREENSHOT_ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function validateScreenshotUpload(
  bytes: Buffer,
  mime: string,
): { ok: true } | { ok: false; error: string } {
  if (!SCREENSHOT_ALLOWED_MIMES.has(mime)) {
    return { ok: false, error: "Only JPEG, PNG, or WebP screenshots are allowed." };
  }
  if (bytes.length === 0) {
    return { ok: false, error: "Empty file." };
  }
  if (bytes.length > SCREENSHOT_MAX_BYTES) {
    return { ok: false, error: "Screenshot must be 4 MB or smaller." };
  }
  return { ok: true };
}

export function screenshotDataUrl(base64: string, mime: string): string {
  return `data:${mime};base64,${base64}`;
}
