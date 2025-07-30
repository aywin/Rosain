// src/components/Sidebar.tsx

interface Video {
  id: string;
  title: string; // ✅ correction ici
}

interface SidebarProps {
  videos: Video[];
  current: number | null;
  setCurrent: (index: number) => void;
}

export default function Sidebar({ videos, current, setCurrent }: SidebarProps) {
  return (
    <div className="w-64 bg-gray-200 border-r p-4">
      <h2 className="text-lg font-bold mb-4">Chapitres du cours</h2>
      {videos.length === 0 ? (
        <p className="text-gray-600">Aucune vidéo disponible.</p>
      ) : (
        <ul>
          {videos.map((v, idx) => (
            <li
              key={v.id}
              className={`mb-2 cursor-pointer ${
                current === idx ? "font-bold text-blue-700" : ""
              }`}
              onClick={() => setCurrent(idx)}
            >
              <span className="hover:underline">
                {idx + 1}. {v.title || "Titre inconnu"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
