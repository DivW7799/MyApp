import { heicTo } from "heic-to";
import { isHeicFile, isHeicType } from "../constants/image-formats";

export async function getBrowserPreviewBlob(file: Blob): Promise<Blob> {
  const fileType = file.type.toLowerCase();

  if (isHeicType(fileType)) {
    return convertHeicToJpeg(file);
  }

  if (file instanceof File && isHeicFile(file)) {
    return convertHeicToJpeg(file);
  }

  return file;
}

async function convertHeicToJpeg(file: Blob): Promise<Blob> {
  const result = await heicTo({
    blob: file,
    type: "image/jpeg",
    quality: 0.9,
  });

  if (result instanceof Blob) {
    return result;
  }

  throw new Error("HEIC conversion returned an unexpected result.");
}
