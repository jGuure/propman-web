import imageCompression from "browser-image-compression";

/** Must match the API's ilsoftware.storage.max-file-size (the API stays the source of truth). */
export const MAX_UPLOAD_BYTES = 1024 * 1024;

export class FileTooLargeError extends Error {
  constructor() {
    super("The file is still larger than 1 MB after optimizing. Choose a smaller image.");
    this.name = "FileTooLargeError";
  }
}

export interface CompressOptions {
  /** Longest side in pixels: 1600 for photos, 512 for logos. */
  maxWidthOrHeight?: number;
}

/**
 * Makes phone photos fit the 1 MB upload limit: resizes, re-encodes to WebP (which also drops EXIF data such as
 * GPS location) and checks the result. Files that are not images are returned unchanged if they already fit.
 */
export async function compressImage(file: File, { maxWidthOrHeight = 1600 }: CompressOptions = {}): Promise<File> {
  if (!file.type.startsWith("image/")) {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new FileTooLargeError();
    }
    return file;
  }
  let compressed: Blob;
  try {
    compressed = await imageCompression(file, {
      maxSizeMB: 0.9,
      maxWidthOrHeight,
      fileType: "image/webp",
      initialQuality: 0.8,
      useWebWorker: true,
    });
  } catch {
    throw new Error("This image could not be read. Use a PNG, JPEG or WebP photo.");
  }
  const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
  const result = new File([compressed], name, { type: "image/webp" });
  if (result.size > MAX_UPLOAD_BYTES) {
    throw new FileTooLargeError();
  }
  return result;
}
