import { createClient } from "@/lib/supabase/client";

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.7;

/** Downscales and re-encodes an image client-side to keep Supabase Storage usage low. */
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser");
  ctx.drawImage(bitmap, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Image compression failed"))),
      "image/jpeg",
      JPEG_QUALITY
    );
  });
}

/**
 * `crypto.randomUUID()` only exists in secure contexts (HTTPS or localhost).
 * Accessing the dev server over plain HTTP via a LAN IP is not a secure
 * context, so it's undefined there; `crypto.getRandomValues` has no such
 * restriction and is available everywhere, so build a UUIDv4 from that.
 */
function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Compresses and uploads a screenshot to the current user's folder, returning its storage path. */
export async function uploadTradeScreenshot(file: File, userId: string): Promise<string> {
  const supabase = createClient();
  const compressed = await compressImage(file);
  const path = `${userId}/${generateUuid()}.jpg`;

  const { error } = await supabase.storage
    .from("trade-screenshots")
    .upload(path, compressed, { contentType: "image/jpeg" });

  if (error) throw error;
  return path;
}
