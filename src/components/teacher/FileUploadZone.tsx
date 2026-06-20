"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, FileText, Image, X, Check, Loader2, Eye } from "lucide-react";
import { uploadFile, validateFile } from "@/helpers/storageHelpers";

interface Props {
  storagePath: string;                    // where to store the file in Firebase Storage
  accept?: "pdf" | "pdfAndImages";       // what types are allowed
  label?: string;
  initialUrl?: string;                    // existing file URL (edit mode)
  initialName?: string;
  onUploadComplete: (url: string, fileName: string) => void;
  onRemove?: () => void;
}

export default function FileUploadZone({
  storagePath,
  accept = "pdfAndImages",
  label,
  initialUrl,
  initialName,
  onUploadComplete,
  onRemove,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(initialUrl || null);
  const [fileName, setFileName] = useState<string | null>(initialName || null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      const err = validateFile(file, accept);
      if (err) { setError(err); return; }

      setProgress(0);
      const path = `${storagePath}/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
      try {
        const url = await uploadFile(path, file, ({ percent }) => setProgress(percent));
        setFileUrl(url);
        setFileName(file.name);
        setProgress(null);
        onUploadComplete(url, file.name);
      } catch {
        setError("Échec de l'upload. Vérifiez vos règles Firebase Storage.");
        setProgress(null);
      }
    },
    [storagePath, accept, onUploadComplete]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleRemove = () => {
    setFileUrl(null);
    setFileName(null);
    setProgress(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
    onRemove?.();
  };

  const isPdf = fileName?.toLowerCase().endsWith(".pdf");
  const acceptAttr =
    accept === "pdf"
      ? "application/pdf"
      : "application/pdf,image/jpeg,image/png,image/webp";

  // Uploaded file display
  if (fileUrl && fileName) {
    return (
      <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
        <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
          {isPdf ? <FileText className="w-4 h-4 text-green-700" /> : <Image className="w-4 h-4 text-green-700" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-green-800 truncate">{fileName}</p>
          <p className="text-xs text-green-600 flex items-center gap-1">
            <Check className="w-3 h-3" /> Fichier envoyé
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-lg transition"
            title="Ouvrir"
          >
            <Eye className="w-4 h-4" />
          </a>
          <button
            type="button"
            title="Supprimer le fichier"
            onClick={handleRemove}
            className="p-1.5 text-green-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Upload in progress
  if (progress !== null) {
    return (
      <div className="border border-gray-200 rounded-xl px-4 py-3 space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
          <span>Envoi en cours… {progress}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  // Drop zone
  return (
    <div>
      {label && <p className="text-xs font-medium text-gray-600 mb-1.5">{label}</p>}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl px-4 py-6 flex flex-col items-center gap-2 cursor-pointer transition ${
          dragging
            ? "border-teal-400 bg-teal-50"
            : "border-gray-200 bg-white hover:border-teal-300 hover:bg-gray-50"
        }`}
      >
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
          <Upload className="w-5 h-5 text-gray-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-600">
            Glissez un fichier ici ou <span className="text-teal-600 underline">parcourez</span>
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {accept === "pdf"
              ? "PDF uniquement · max 10 MB"
              : "PDF, JPEG, PNG, WebP · max 10 MB"}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={acceptAttr}
          onChange={handleInputChange}
          className="hidden"
        />
      </div>
      {error && (
        <p className="text-xs text-red-500 mt-1.5">{error}</p>
      )}
    </div>
  );
}
