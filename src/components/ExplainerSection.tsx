"use client";

import React, { useState } from "react";
import { FiPlay } from "react-icons/fi";

// Remplace youtubeId par l'ID de ta vidéo YouTube (ex: "dQw4w9WgXcQ")
const VIDEOS = [
    {
        id: 1,
        youtubeId: "",
        title: "Pourquoi Rosaine Academy ?",
        subtitle: "Vue d'ensemble de la plateforme",
        tag: "Présentation",
        tagColor: "#1F77B0",
    },
    {
        id: 2,
        youtubeId: "",
        title: "Pour les élèves",
        subtitle: "Découvrez comment apprendre efficacement",
        tag: "Élèves",
        tagColor: "#65B04E",
    },
    {
        id: 3,
        youtubeId: "",
        title: "Pour les tuteurs & parents",
        subtitle: "Suivez la progression de vos enfants",
        tag: "Tuteurs",
        tagColor: "#0D9488",
    },
    {
        id: 4,
        youtubeId: "",
        title: "Fonctionnalités avancées",
        subtitle: "Quiz, IA et tableaux de bord",
        tag: "Fonctionnalités",
        tagColor: "#7C3AED",
    },
];

function VideoCard({ video }: { video: (typeof VIDEOS)[0] }) {
    const [playing, setPlaying] = useState(false);
    const hasVideo = !!video.youtubeId;

    return (
        <div className="flex-shrink-0 w-72 md:w-auto rounded-2xl overflow-hidden shadow-lg border border-gray-100 bg-white group hover:shadow-xl transition-shadow duration-300">
            {/* Zone vidéo 16:9 */}
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                {playing && hasVideo ? (
                    <iframe
                        className="absolute inset-0 w-full h-full"
                        src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1`}
                        title={video.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                ) : (
                    <div
                        className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer"
                        onClick={() => hasVideo && setPlaying(true)}
                    >
                        {hasVideo ? (
                            <>
                                <img
                                    src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`}
                                    alt={video.title}
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/35 transition-colors">
                                    <div
                                        className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
                                        style={{ backgroundColor: "rgba(37,54,76,0.9)" }}
                                    >
                                        <FiPlay size={22} color="white" style={{ marginLeft: 3 }} />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div
                                className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                                style={{ backgroundColor: "#F1F5F9" }}
                            >
                                <div
                                    className="w-16 h-16 rounded-full flex items-center justify-center shadow-md"
                                    style={{ backgroundColor: "#25364C" }}
                                >
                                    <FiPlay size={24} color="white" style={{ marginLeft: 3 }} />
                                </div>
                                <span className="text-sm font-medium text-gray-400">Vidéo à venir</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Infos */}
            <div className="p-4">
                <span
                    className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-2 text-white"
                    style={{ backgroundColor: video.tagColor }}
                >
                    {video.tag}
                </span>
                <h3 className="font-bold text-gray-800 text-base leading-tight mb-1">{video.title}</h3>
                <p className="text-sm text-gray-500">{video.subtitle}</p>
            </div>
        </div>
    );
}

export default function ExplainerSection() {
    return (
        <section className="py-20 px-4 md:px-6 overflow-hidden" style={{ backgroundColor: "#F9FAFB" }}>
            <div className="max-w-7xl mx-auto">

                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-semibold mb-3" style={{ color: "#25364C" }}>
                        Découvrez Rosaine Academy en vidéo
                    </h2>
                    <p className="text-gray-500 text-base md:text-lg max-w-2xl mx-auto">
                        Des courtes vidéos pour comprendre la plateforme et commencer sans effort.
                    </p>
                </div>

                {/* Mobile : scroll horizontal | Desktop : grille 4 colonnes */}
                <div
                    id="explainer-videos"
                    className="flex gap-5 overflow-x-auto pb-4 md:grid md:grid-cols-4 md:overflow-x-visible"
                    style={{ scrollbarWidth: "thin" }}
                >
                    {VIDEOS.map((v) => (
                        <VideoCard key={v.id} video={v} />
                    ))}
                </div>

            </div>
        </section>
    );
}