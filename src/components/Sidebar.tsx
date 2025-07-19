// src/components/Sidebar.tsx

interface Video {
  id: string;
  title: string;
}

interface SidebarProps {
  videos: Video[];
  current: number;
  setCurrent: (index: number) => void;
}

export default function Sidebar({ videos, current, setCurrent }: SidebarProps) {
  return (
    <div className="w-64 bg-gray-200 border-r p-4">
      <h2 className="text-lg font-bold mb-4">Chapitres du cours</h2>
      <ul>
        {videos.map((v, idx) => (
          <li
            key={v.id}
            className={`mb-2 cursor-pointer ${
              current === idx ? "font-bold text-blue-700" : ""
            }`}
            onClick={() => setCurrent(idx)}
          >
            {idx + 1}. {v.title}
          </li>
        ))}
      </ul>
    </div>
  );
}
