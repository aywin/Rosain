// src/components/tuto/Sidebar.tsx
"use client";

import React from "react";
import { FaTimes, FaVideo, FaFileAlt, FaCheckCircle, FaClock, FaPlayCircle } from "react-icons/fa";

interface ContentItem {
  id: string;
  title: string;
  type: "video" | "exo";
}

interface SidebarProps {
  content: ContentItem[];
  current: number | null;
  setCurrent: (index: number) => void;
  completedIds?: Set<string>;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({
  content,
  current,
  setCurrent,
  completedIds = new Set(),
  isOpen = true,
  onClose,
}: SidebarProps) {
  const completedCount = content.filter((item) => completedIds.has(item.id)).length;
  const progressPct =
    content.length > 0 ? Math.round((completedCount / content.length) * 100) : 0;

  return (
    <div
      className={`
        fixed lg:static top-0 left-0 h-full z-30
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        bg-white border-r border-gray-200 w-72 flex flex-col shadow-xl lg:shadow-none
      `}
    >
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3.5 border-b bg-gray-50 flex-shrink-0">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
            Cours
          </p>
          <h2 className="text-sm font-bold text-gray-800">Contenu du cours</h2>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 hover:bg-gray-200 rounded-lg transition text-gray-500"
          aria-label="Fermer"
        >
          <FaTimes className="w-4 h-4" />
        </button>
      </div>

      {/* Liste */}
      <ul className="flex-1 overflow-y-auto py-1 px-0">
        {content.map((item, index) => {
          const isActive = current === index;
          const isCompleted = completedIds.has(item.id);

          return (
            <li key={item.id} className="border-b border-gray-100 last:border-0">
              <button
                onClick={() => setCurrent(index)}
                className={`
                  w-full text-left px-4 py-3 transition-all duration-150
                  flex items-start gap-3 group
                  ${isActive
                    ? "bg-teal-50 border-l-[3px] border-teal-700"
                    : "border-l-[3px] border-transparent hover:bg-gray-50"
                  }
                `}
              >
                {/* 
                  Icône — alignée sur la première ligne du titre grâce à items-start
                  + mt-0.5 pour coller au cap-height du texte
                */}
                <div className="flex-shrink-0 mt-0.5">
                  {isCompleted ? (
                    // ⚡ Coche toujours visible si complété, même si l'item est actif
                    <FaCheckCircle
                      className={`w-4 h-4 ${isActive ? "text-teal-700" : "text-teal-500"}`}
                    />
                  ) : item.type === "video" ? (
                    <FaPlayCircle
                      className={`w-4 h-4 ${isActive ? "text-teal-700" : "text-gray-400 group-hover:text-teal-600"} transition-colors`}
                    />
                  ) : (
                    <FaFileAlt
                      className={`w-4 h-4 ${isActive ? "text-teal-700" : "text-gray-400 group-hover:text-emerald-600"} transition-colors`}
                    />
                  )}
                </div>

                {/* Texte : titre en haut, type en bas */}
                <div className="flex-1 min-w-0">
                  {/* Titre */}
                  <p
                    className={`
                      text-xs leading-snug line-clamp-2
                      ${isActive
                        ? "font-semibold text-teal-900"
                        : isCompleted
                          ? "text-gray-400"
                          : "text-gray-800 group-hover:text-gray-900"
                      }
                    `}
                  >
                    {item.title}
                  </p>
                  {/* Type — sous le titre */}
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className={`
                        text-[10px] font-medium uppercase tracking-wide
                        ${item.type === "video"
                          ? isCompleted ? "text-teal-400" : "text-teal-600"
                          : isCompleted ? "text-amber-400" : "text-amber-600"
                        }
                      `}
                    >
                      {item.type === "video" ? "Vidéo" : "Exercice"}
                    </span>
                    {isActive && (
                      <FaClock className="w-2.5 h-2.5 text-teal-500 animate-pulse" />
                    )}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Footer progression */}
      <div className="px-4 py-3 border-t bg-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
            Progression
          </span>
          <span className="text-[11px] font-bold text-teal-700">{progressPct}%</span>
        </div>
        <div className="w-full bg-gray-200 h-1.5 overflow-hidden" style={{ borderRadius: 0 }}>
          <div
            className="bg-teal-600 h-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5">
          {completedCount}/{content.length} étape{completedCount > 1 ? "s" : ""} complétée{completedCount > 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}