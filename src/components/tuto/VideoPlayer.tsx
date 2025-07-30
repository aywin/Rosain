"use client";

import { useEffect, useRef, useState } from "react";

interface VideoPlayerProps {
  url: string;
  title: string;
  onAssistantClick: () => void;
}

export default function VideoPlayer({
  url,
  title,
  onAssistantClick,
}: VideoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [showQuestion, setShowQuestion] = useState(false);
  const [hasAsked, setHasAsked] = useState(false);

  // Extrait l'ID vidéo
  const getVideoId = (url: string) => {
    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  const videoId = getVideoId(url);
  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${typeof window !== "undefined" ? window.location.origin : ""}`
    : url;

  // Fonction pour envoyer un message de pause à l’iframe
  const pauseVideo = () => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: "pauseVideo" }),
      "*"
    );
  };

  const playVideo = () => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: "playVideo" }),
      "*"
    );
  };

  // Lance le timer une seule fois
  useEffect(() => {
    if (hasAsked || !videoId) return;

    const timer = setTimeout(() => {
      pauseVideo();
      setShowQuestion(true);
      setHasAsked(true);
    }, 60000); // 1 minute

    return () => clearTimeout(timer);
  }, [videoId, hasAsked]);

  const handleResponse = (understood: boolean) => {
    if (understood) {
      playVideo();
    } else {
      onAssistantClick(); // Ouvre l'assistant si non compris
    }
    setShowQuestion(false);
  };

  return (
    <div className="flex flex-col items-center justify-center relative">
      <iframe
        ref={iframeRef}
        className="w-[70%] aspect-video rounded-lg mt-6 shadow"
        src={embedUrl}
        title={title}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      ></iframe>

      {/* Question après 1 min */}
      {showQuestion && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20 text-white rounded-lg">
          <p className="text-2xl mb-4">Tu as compris ?</p>
          <div className="flex gap-4">
            <button
              className="bg-green-500 px-4 py-2 rounded"
              onClick={() => handleResponse(true)}
            >
              Oui
            </button>
            <button
              className="bg-red-500 px-4 py-2 rounded"
              onClick={() => handleResponse(false)}
            >
              Non
            </button>
          </div>
        </div>
      )}

      <div className="w-[70%] flex justify-end mt-4">
        <button
          className="px-2 py-2 border rounded hover:bg-blue-700 hover:text-white transition"
          onClick={onAssistantClick}
        >
          Ouvrir Assistant IA →
        </button>
      </div>
    </div>
  );
}
