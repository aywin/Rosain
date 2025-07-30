"use client";

import React from "react";

interface SidebarProps {
  videos: { id: string; title: string }[];
  current: number | null;
  setCurrent: (index: number) => void;
}

export default function Sidebar({ videos, current, setCurrent }: SidebarProps) {
  return (
    <div className="w-64 bg-gray-200 p-4 overflow-y-auto">
      <h2 className="text-lg font-bold mb-4">Chapitres du cours</h2>
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
