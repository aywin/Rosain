"use client";

import { useEffect, useState, useMemo, memo, useRef } from "react";
import { MathJax } from "better-react-mathjax";
import { preprocessLatex } from "@/components/admin/utils/latexUtils";

interface TranscriptSegment {
  start: number;
  duration: number;
  text: string;
}

interface VideoTranscriptProps {
  transcript: TranscriptSegment[];
  currentTime: number;
  onSeek?: (time: number) => void;
  language?: string;
  isGenerated?: boolean;
  isMathJaxFormatted?: boolean;
}

// ✅ Composant mémoïsé pour un segment
const TranscriptSegmentItem = memo(({
  segment,
  index,
  isActive,
  onSeek,
  isMathJaxFormatted
}: {
  segment: TranscriptSegment;
  index: number;
  isActive: boolean;
  onSeek?: (time: number) => void;
  isMathJaxFormatted?: boolean;
}) => {
  const renderSegmentText = (text: string) => {
    const hasLatex = /\$|\\\(|\\\[|\\begin\{/.test(text);

    if (!hasLatex && isMathJaxFormatted === false) {
      return <span>{text}</span>;
    }

    const processedText = preprocessLatex(text);

    return (
      <MathJax dynamic inline hideUntilTypeset="first">
        {processedText}
      </MathJax>
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
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

      <div
        className={`
          text-sm leading-relaxed flex-1
          ${isActive ? 'text-gray-900 font-medium' : 'text-gray-700'}
        `}
      >
        {renderSegmentText(segment.text)}
      </div>
    </div>
  );
});

TranscriptSegmentItem.displayName = 'TranscriptSegmentItem';

export default function VideoTranscript({
  transcript,
  currentTime,
  onSeek,
  language,
  isGenerated,
  isMathJaxFormatted
}: VideoTranscriptProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const lastIndexRef = useRef<number | null>(null);

  // ✅ Synchronisation parfaite - pas d'arrondi artificiel !
  useEffect(() => {
    if (transcript.length === 0) {
      if (lastIndexRef.current !== null) {
        setActiveIndex(null);
        lastIndexRef.current = null;
      }
      return;
    }

    let newIndex: number;

    // Si on est avant le premier segment, activer le premier segment
    if (currentTime < transcript[0].start) {
      newIndex = 0;
    } else {
      // Chercher le segment correspondant
      const foundIndex = transcript.findIndex((seg) => {
        const segmentEnd = seg.start + seg.duration;
        return currentTime >= seg.start && currentTime < segmentEnd;
      });

      // Si aucun segment trouvé, garder le dernier segment actif
      newIndex = foundIndex === -1 ? transcript.length - 1 : foundIndex;
    }

    // ✅ Ne mettre à jour QUE si l'index a vraiment changé
    if (newIndex !== lastIndexRef.current) {
      setActiveIndex(newIndex);
      lastIndexRef.current = newIndex;
    }
  }, [currentTime, transcript]);

  const getLanguageFlag = (lang?: string) => {
    const flags: Record<string, string> = {
      fr: '🇫🇷',
      en: '🇬🇧',
      es: '🇪🇸',
      de: '🇩🇪',
      it: '🇮🇹',
      pt: '🇵🇹',
      ar: '🇸🇦',
    };
    return flags[lang || ''] || '🌐';
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-lg text-gray-800">
              📝 Transcription de la vidéo
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Cliquez sur un segment pour avancer dans la vidéo
            </p>
          </div>

          <div className="flex gap-2 items-center">
            {language && (
              <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded">
                {getLanguageFlag(language)} {language.toUpperCase()}
              </span>
            )}
            {isGenerated !== undefined && (
              <span
                className={`text-xs px-2 py-1 rounded ${isGenerated
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-green-100 text-green-800'
                  }`}
              >
                {isGenerated ? '🤖 Auto' : '✍️ Manuelle'}
              </span>
            )}
            {isMathJaxFormatted && (
              <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">
                📐 MathJax
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto p-6 space-y-3">
        {transcript.map((segment, index) => (
          <TranscriptSegmentItem
            key={index}
            segment={segment}
            index={index}
            isActive={index === activeIndex}
            onSeek={onSeek}
            isMathJaxFormatted={isMathJaxFormatted}
          />
        ))}
      </div>
    </div>
  );
}