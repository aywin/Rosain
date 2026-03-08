"use client";

import React from "react";
import { FaTimes, FaVideo, FaFileAlt, FaCheckCircle, FaClock } from "react-icons/fa";

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
  const completedCount = current !== null ? current + 1 : 0;
  const progressPct = content.length > 0 ? Math.round((completedCount / content.length) * 100) : 0;

  return (
    <div
      className={`
        fixed lg:static top-0 left-0 h-full z-30
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        bg-white border-r border-gray-200 w-72 flex flex-col shadow-xl lg:shadow-none
      `}
    >
      {/* ── Header ── */}
      <div className="flex justify-between items-center px-4 py-3.5 border-b bg-gray-50 flex-shrink-0">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Cours</p>
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

      {/* ── Liste ── */}
      <ul className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {content.map((item, index) => {
          const isActive = current === index;
          const isPast = current !== null && index < current;

          return (
            <li key={item.id}>
              <button
                onClick={() => setCurrent(index)}
                className={`
                  w-full text-left px-2.5 py-2.5 transition-all duration-150
                  flex items-start gap-3 group
                  ${isActive
                    ? "bg-teal-50 border-l-4 border-teal-700 shadow-sm"
                    : isPast
                      ? "border-l-4 border-transparent hover:bg-gray-50"
                      : "border-l-4 border-transparent hover:bg-gray-50"
                  }
                `}
              >
                {/* Icône */}
                <div className={`
                  flex-shrink-0 w-8 h-8 flex items-center justify-center transition-all duration-150
                  ${isActive
                    ? "bg-teal-700 text-white"
                    : isPast
                      ? item.type === "video"
                        ? "bg-teal-700/60 text-white"
                        : "bg-emerald-600/70 text-white"
                      : item.type === "video"
                        ? "bg-teal-700/20 text-teal-700 group-hover:bg-teal-700/30"
                        : "bg-emerald-600/20 text-emerald-700 group-hover:bg-emerald-600/30"
                  }
                `}
                  style={{ borderRadius: 0 }}
                >
                  {isPast && item.type === "video"
                    ? <FaCheckCircle className="w-3.5 h-3.5" />
                    : item.type === "video"
                      ? <FaVideo className="w-3.5 h-3.5" />
                      : <FaFileAlt className="w-3.5 h-3.5" />
                  }
                </div>

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`
                      text-[10px] font-bold px-1.5 py-0.5
                      ${isActive
                        ? "bg-teal-700 text-white"
                        : "bg-gray-200 text-gray-600"
                      }
                    `}
                      style={{ borderRadius: 0 }}
                    >
                      {index + 1}
                    </span>
                    <span className={`
                      text-[10px] font-semibold uppercase tracking-wide
                      ${item.type === "video" ? "text-teal-600" : "text-amber-600"}
                    `}>
                      {item.type === "video" ? "Vidéo" : "Exercice"}
                    </span>
                  </div>
                  <p className={`
                    text-xs leading-snug line-clamp-2
                    ${isActive
                      ? "font-semibold text-teal-900"
                      : isPast
                        ? "text-gray-500"
                        : "text-gray-700"
                    }
                  `}>
                    {item.title}
                  </p>
                </div>

                {/* Indicateur actif */}
                {isActive && (
                  <FaClock className="flex-shrink-0 w-3 h-3 text-teal-600 animate-pulse mt-0.5" />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* ── Footer progression ── */}
      <div className="px-4 py-3 border-t bg-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Progression</span>
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