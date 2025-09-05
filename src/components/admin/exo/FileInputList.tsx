"use client";

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
    <div className="mt-4">
      <label className="font-semibold mb-1 block">{label}</label>
      {files.map((file, i) => (
        <div key={i} className="flex gap-2 mb-2">
          <input
            type="url"
            className="border px-3 py-2 rounded w-full"
            placeholder={`Lien fichier #${i + 1}`}
            value={file}
            onChange={(e) => updateFile(i, e.target.value)}
          />
          <button
            type="button"
            onClick={() => removeFile(i)}
            className="bg-red-500 text-white px-2 rounded"
          >
            X
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addFile}
        className="bg-green-500 text-white px-3 py-1 rounded"
      >
        + Ajouter un fichier
      </button>
    </div>
  );
}
