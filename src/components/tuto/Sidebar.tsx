// front/src/components/tuto/Sidebar.tsx
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
  return (
    <>
      <div
        className={`
          fixed lg:static top-0 left-0 h-full z-30
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          bg-white border-r border-gray-200 w-72 flex flex-col shadow-xl lg:shadow-none
        `}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">Contenu du cours</h2>
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-gray-200 rounded-full transition"
            aria-label="Fermer"
          >
            <FaTimes className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Liste du contenu */}
        <ul className="flex-1 overflow-y-auto p-3 space-y-1">
          {content.map((item, index) => {
            const isActive = current === index;
            const isPast = current !== null && index < current;

            return (
              <li key={item.id}>
                <button
                  onClick={() => setCurrent(index)}
                  className={`
                    w-full text-left p-3 rounded-lg transition-all duration-200
                    flex items-start gap-3 group
                    ${isActive
                      ? "bg-blue-100 border-l-4 border-blue-600 shadow-sm"
                      : isPast
                        ? "bg-green-50 hover:bg-green-100"
                        : "hover:bg-gray-100"
                    }
                  `}
                >
                  {/* Icône */}
                  <div className={`
                    flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
                    ${isActive
                      ? "bg-blue-600 text-white"
                      : isPast
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-600 group-hover:bg-gray-300"
                    }
                  `}>
                    {item.type === "video" ? (
                      isPast ? <FaCheckCircle className="w-5 h-5" /> : <FaVideo className="w-5 h-5" />
                    ) : (
                      <FaFileAlt className="w-5 h-5" />
                    )}
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`
                        text-xs font-semibold px-2 py-0.5 rounded-full
                        ${isActive
                          ? "bg-blue-600 text-white"
                          : "bg-gray-300 text-gray-700"
                        }
                      `}>
                        {index + 1}
                      </span>
                      <span className={`
                        text-xs font-medium
                        ${item.type === "video" ? "text-blue-600" : "text-orange-600"}
                      `}>
                        {item.type === "video" ? "Vidéo" : "Exercice"}
                      </span>
                    </div>
                    <p className={`
                      text-sm leading-tight line-clamp-2
                      ${isActive
                        ? "font-semibold text-blue-900"
                        : isPast
                          ? "text-gray-700"
                          : "text-gray-800"
                      }
                    `}>
                      {item.title}
                    </p>
                  </div>

                  {/* Indicateur de statut */}
                  {isActive && (
                    <FaClock className="flex-shrink-0 w-4 h-4 text-blue-600 animate-pulse" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Footer avec progression */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Progression</span>
            <span className="font-semibold">
              {current !== null ? Math.round(((current + 1) / content.length) * 100) : 0}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-full transition-all duration-300"
              style={{
                width: `${current !== null ? ((current + 1) / content.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}