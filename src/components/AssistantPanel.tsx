// src/components/AssistantPanel.tsx

interface AssistantPanelProps {
  onClose: () => void;
}

export default function AssistantPanel({ onClose }: AssistantPanelProps) {
  return (
    <div className="absolute top-0 right-0 h-full w-[320px] bg-white border-l shadow-lg flex flex-col z-20">
      <button
        className="self-end m-2 px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
        onClick={onClose}
      >
        ×
      </button>
      <div className="flex-1 p-4 overflow-y-auto">
        <h3 className="font-bold mb-2">Assistant IA</h3>
        <div className="mb-2 text-sm text-gray-600">👋 Bonjour, comment puis-je t'aider sur cette vidéo ?</div>
        {/* Ici tu peux ajouter une fausse interface de chat ou d’aide */}
        <div className="mt-4 text-xs text-gray-400">Exemple : "Explique-moi le passage à 3:14"</div>
      </div>
    </div>
  );
}
