"use client";

import { useEffect, useState, useRef } from "react";

interface TranscriptSegment {
  start: number;
  duration: number;
  text: string;
}

interface VideoTranscriptProps {
  transcript: TranscriptSegment[];
  currentTime: number;
  onSeek?: (time: number) => void;
}

export default function VideoTranscript({
  transcript,
  currentTime,
  onSeek
}: VideoTranscriptProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  // 🔹 Trouver le segment actif
  useEffect(() => {
    const index = transcript.findIndex((seg, i) => {
      const nextStart = transcript[i + 1]?.start || Infinity;
      return currentTime >= seg.start && currentTime < nextStart;
    });
    setActiveIndex(index !== -1 ? index : null);
  }, [currentTime, transcript]);

  // 🔹 Auto-scroll vers le segment actif
  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      const container = containerRef.current;
      const active = activeRef.current;
      const containerRect = container.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();

      // Scroll si l'élément actif n'est pas visible
      if (
        activeRect.top < containerRect.top ||
        activeRect.bottom > containerRect.bottom
      ) {
        active.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeIndex]);

  // 🔹 Formater le temps (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!transcript || transcript.length === 0) {
    return (
      <div className="w-[90%] mt-8 mb-8 bg-white rounded-lg shadow p-6 text-gray-500 text-center">
        <p>📝 Aucune transcription disponible pour cette vidéo</p>
      </div>
    );
  }

  return (
    <div className="w-[90%] mt-8 mb-8 bg-white rounded-lg shadow overflow-hidden">
      <div className="bg-gray-50 border-b px-6 py-3">
        <h2 className="font-semibold text-lg text-gray-800">
          📝 Transcription de la vidéo
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Cliquez sur un segment pour avancer dans la vidéo
        </p>
      </div>

      <div
        ref={containerRef}
        className="max-h-64 overflow-y-auto p-6 space-y-3"
      >
        {transcript.map((segment, index) => {
          const isActive = index === activeIndex;

          return (
            <div
              key={index}
              ref={isActive ? activeRef : null}
              onClick={() => onSeek?.(segment.start)}
              className={`
                flex gap-3 p-3 rounded-lg transition-all cursor-pointer
                ${isActive
                  ? 'bg-blue-100 border-l-4 border-blue-600 shadow-md'
                  : 'hover:bg-gray-100'
                }
              `}
            >
              <span
                className={`
                  text-sm font-mono shrink-0 mt-0.5
                  ${isActive ? 'text-blue-700 font-semibold' : 'text-gray-500'}
                `}
              >
                {formatTime(segment.start)}
              </span>

              <p
                className={`
                  text-base leading-relaxed
                  ${isActive ? 'text-gray-900 font-medium' : 'text-gray-700'}
                `}
              >
                {segment.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}