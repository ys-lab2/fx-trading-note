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

/** Compresses and uploads a screenshot to the current user's folder, returning its storage path. */
export async function uploadTradeScreenshot(file: File, userId: string): Promise<string> {
  const supabase = createClient();
  const compressed = await compressImage(file);
  const path = `${userId}/${crypto.randomUUID()}.jpg`;

  const { error } = await supabase.storage
    .from("trade-screenshots")
    .upload(path, compressed, { contentType: "image/jpeg" });

  if (error) throw error;
  return path;
}
