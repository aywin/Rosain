import { storage } from "@/firebase";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

export type UploadProgress = {
  percent: number;
  state: "running" | "paused" | "error" | "success";
};

/**
 * Upload a file to Firebase Storage and return its public download URL.
 * @param path  Storage path, e.g. "teacherContent/{uid}/{contentId}/doc.pdf"
 * @param file  The File object to upload
 * @param onProgress  Optional callback with upload progress (0–100)
 */
export function uploadFile(
  path: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
    });

    task.on(
      "state_changed",
      (snapshot) => {
        const percent = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        onProgress?.({ percent, state: snapshot.state as any });
      },
      (error) => {
        onProgress?.({ percent: 0, state: "error" });
        reject(error);
      },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        onProgress?.({ percent: 100, state: "success" });
        resolve(url);
      }
    );
  });
}

/** Delete a file from Storage by its full path (not URL). */
export async function deleteFile(path: string): Promise<void> {
  await deleteObject(ref(storage, path));
}

/** Build consistent storage paths */
export const storagePaths = {
  teacherResource: (teacherId: string, contentId: string, fileName: string) =>
    `teacherContent/${teacherId}/${contentId}/${fileName}`,

  submission: (studentId: string, assignmentId: string, fileName: string) =>
    `submissions/${studentId}/${assignmentId}/${fileName}`,
};

/** Accepted MIME types */
export const ACCEPTED_TYPES = {
  pdfOnly: { "application/pdf": [".pdf"] },
  pdfAndImages: {
    "application/pdf": [".pdf"],
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/webp": [".webp"],
  },
};

export const MAX_FILE_SIZE_MB = 10;

export function validateFile(
  file: File,
  accept: "pdf" | "pdfAndImages"
): string | null {
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > MAX_FILE_SIZE_MB) {
    return `Fichier trop volumineux (max ${MAX_FILE_SIZE_MB} MB).`;
  }
  const allowedTypes =
    accept === "pdf"
      ? ["application/pdf"]
      : ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return accept === "pdf"
      ? "Seuls les fichiers PDF sont acceptés."
      : "Fichier non accepté. PDF, JPEG, PNG ou WebP uniquement.";
  }
  return null;
}
