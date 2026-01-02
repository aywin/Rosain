//FileInputList.tsx
"use client";

import React from "react";

interface Props {
  label: string;
  files: string[];
  onChange: (files: string[]) => void;
}

export default function FileInputList({ label, files, onChange }: Props) {
  const updateFile = (index: number, value: string) => {
    const newFiles = [...files];
    newFiles[index] = value;
    onChange(newFiles);
  };

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  const addFile = () => {
    onChange([...files, ""]);
  };

  return (
    <div className="flex flex-col gap-3 mt-4">
      <label className="font-semibold text-gray-700">{label}</label>

      {files.length === 0 && (
        <p className="text-gray-500 italic text-sm">
          Aucun fichier ajouté pour l’instant...
        </p>
      )}

      {files.map((file, i) => (
        <div
          key={i}
          className="flex flex-col gap-1 p-2 border rounded bg-gray-50"
        >
          <div className="flex gap-2">
            <input
              type="url"
              className="border px-3 py-2 rounded w-full text-sm"
              placeholder={`Lien fichier #${i + 1}`}
              value={file}
              onChange={(e) => updateFile(i, e.target.value)}
            />
            <button
              type="button"
              onClick={() => removeFile(i)}
              className="bg-red-500 text-white px-2 rounded hover:bg-red-600"
            >
              ✕
            </button>
          </div>

          {/* Aperçu du fichier si URL présente */}
          {file && (
            <div className="text-sm mt-1">
              {file.match(/\.(jpg|jpeg|png|gif|svg)$/i) ? (
                <img
                  src={file}
                  alt={`Preview ${i + 1}`}
                  className="max-h-32 rounded border"
                />
              ) : (
                <a
                  href={file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Ouvrir le fichier
                </a>
              )}
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addFile}
        className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 self-start"
      >
        + Ajouter un fichier
      </button>
    </div>
  );
}
