"use client";

interface AlertModalProps {
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function AlertModal({ title = "Attention", message, onConfirm, onCancel }: AlertModalProps) {

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <p className="mb-6">{message}</p>
        <div className="flex justify-end gap-4">
          <button
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            onClick={onCancel}
          >
            Annuler
          </button>
          <button
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            onClick={onConfirm}
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}
