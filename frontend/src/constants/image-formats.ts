export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/bmp",
  "image/tiff",
  "image/heic",
  "image/heif",
  "image/avif",
] as const;

export const IMAGE_ACCEPT_ATTRIBUTE =
  ".jpg,.jpeg,.png,.webp,.bmp,.tif,.tiff,.heic,.heif,.avif";

export const IMAGE_FORMAT_LABEL =
  "JPEG, PNG, WebP, BMP, TIFF, HEIC, HEIF, or AVIF";

const ALLOWED_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".bmp",
  ".tif",
  ".tiff",
  ".heic",
  ".heif",
  ".avif",
] as const;

export function isAllowedImageType(contentType: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(
    contentType.toLowerCase() as (typeof ALLOWED_IMAGE_TYPES)[number],
  );
}

export function isAllowedImageFile(file: File): boolean {
  const contentType = file.type.toLowerCase();

  if (isAllowedImageType(contentType)) {
    return true;
  }

  const filename = file.name.toLowerCase();

  return ALLOWED_IMAGE_EXTENSIONS.some((extension) =>
    filename.endsWith(extension),
  );
}

export function isHeicType(contentType: string): boolean {
  const normalizedType = contentType.toLowerCase();

  return normalizedType === "image/heic" || normalizedType === "image/heif";
}

export function isHeicFile(file: File): boolean {
  const contentType = file.type.toLowerCase();

  if (isHeicType(contentType)) {
    return true;
  }

  const filename = file.name.toLowerCase();

  return filename.endsWith(".heic") || filename.endsWith(".heif");
}
