"use client";

import React from "react";
import { X } from "lucide-react";

interface ContentItem {
  id: string;
  title: string;
  type: "video" | "exo";
}

interface SidebarProps {
  content: ContentItem[];
  current: number | null;
  setCurrent: (index: number) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({
  content,
  current,
  setCurrent,
  isOpen = true,
  onClose,
}: SidebarProps) {
  return (
    <div
      className={`
        fixed lg:static top-0 left-0 h-full z-30
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        bg-gray-200 w-64 p-4 overflow-y-auto
      `}
    >
      {/* Bouton mobile */}
      <div className="flex justify-between items-center mb-4 lg:hidden">
        <h2 className="text-lg font-bold">Chapitres du cours</h2>
        <button onClick={onClose}>
          <X className="w-5 h-5" />
        </button>
      </div>

      <ul className="space-y-2">
        {content.map((item, index) => (
          <li
            key={item.id}
            className={`cursor-pointer flex items-center gap-2 ${
              current === index ? "font-bold text-blue-600" : ""
            }`}
            onClick={() => setCurrent(index)}
          >
            {item.type === "video" ? "🎬" : "📝"} {index + 1}. {item.title}
          </li>
        ))}
      </ul>
    </div>
  );
}
