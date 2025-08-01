"use client";

import React from "react";
import { X } from "lucide-react";

interface SidebarProps {
  videos: { id: string; title: string }[];
  current: number | null;
  setCurrent: (index: number) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({
  videos,
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
      {/* Bouton de fermeture sur mobile */}
      <div className="flex justify-between items-center mb-4 lg:hidden">
        <h2 className="text-lg font-bold">Chapitres du cours</h2>
        <button onClick={onClose}>
          <X className="w-5 h-5" />
        </button>
      </div>

      <ul className="space-y-2">
        {videos.map((video, index) => (
          <li
            key={video.id}
            className={`cursor-pointer ${
              current === index ? "font-bold text-blue-600" : ""
            }`}
            onClick={() => setCurrent(index)}
          >
            {index + 1}. {video.title}
          </li>
        ))}
      </ul>
    </div>
  );
}

