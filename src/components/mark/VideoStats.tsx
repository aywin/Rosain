// src/components/mark/VideoStats.tsx
"use client";

import React from "react";
import { Video as VideoIcon, AlertTriangle, CheckCircle } from "lucide-react";
import { VideoProgress, getVideoStats, getVideoSuggestion } from "@/utils/progress";

interface Props {
  videos: VideoProgress[];
  videoTitles?: Record<string, string>;
}

export default function VideoStats({ videos, videoTitles = {} }: Props) {
  if (!videos || videos.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <VideoIcon className="w-6 h-6 mx-auto mb-2" />
        Aucun progrès vidéo enregistré.
      </div>
    );
  }

  const stats = getVideoStats(videos);
  const suggestion = getVideoSuggestion(stats.percent);

  return (
    <div className="p-4 bg-white rounded-2xl shadow">
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <VideoIcon className="w-5 h-5 text-blue-600" />
        Statistiques Vidéos
      </h2>

      {/* Résumé global */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-sm text-gray-600">Terminées</p>
          <p className="text-xl font-bold text-green-600">{stats.completed}</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-3 text-center">
          <p className="text-sm text-gray-600">Commencées</p>
          <p className="text-xl font-bold text-orange-600">{stats.started}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <p className="text-sm text-gray-600">Non commencées</p>
          <p className="text-xl font-bold text-red-600">{stats.notStarted}</p>
        </div>
      </div>

      {/* Détails stats */}
      <div className="mb-4 text-sm text-gray-700">
        <p>Taux d’avancement global : <span className="font-semibold">{stats.percent.toFixed(0)}%</span></p>
        <p>Temps regardé : <span className="font-semibold">{stats.totalMinutesWatched.toFixed(0)} min</span></p>
        <p>Temps restant : <span className="font-semibold">{stats.totalMinutesRemaining.toFixed(0)} min</span></p>
        <p>Dernière position atteinte : <span className="font-semibold">{stats.lastPosition.toFixed(0)} sec</span></p>
      </div>

      {/* Suggestion */}
      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-800 mb-4">
        <AlertTriangle className="w-4 h-4" />
        {suggestion}
      </div>

      {/* Détails vidéos */}
      <div>
        <h3 className="text-md font-semibold mb-2">Détails vidéos</h3>
        <div className="overflow-x-auto rounded-lg bg-gray-50 p-4">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-blue-100">
                <th className="border-b p-3 text-left text-sm font-semibold text-gray-700">Vidéo</th>
                <th className="border-b p-3 text-left text-sm font-semibold text-gray-700">Regardé (min)</th>
                <th className="border-b p-3 text-left text-sm font-semibold text-gray-700">Dernière position (sec)</th>
                <th className="border-b p-3 text-left text-sm font-semibold text-gray-700">Statut</th>
                <th className="border-b p-3 text-left text-sm font-semibold text-gray-700">MàJ</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((v) => {
                const watched = Number(v.minutesWatched || 0);
                const remaining = Number(v.minutesRemaining || 0);
                const pct = watched + remaining > 0 ? (watched / (watched + remaining)) * 100 : 0;
                return (
                  <tr key={v.id} className="hover:bg-blue-50 transition-colors">
                    <td className="border-b p-3 text-sm text-gray-600">
                      {videoTitles[v.videoId] || v.videoId}
                    </td>
                    <td className="border-b p-3 text-sm text-gray-600">
                      <div className="flex items-center">
                        {watched.toFixed(1)} min
                        <div className="ml-2 h-2 w-24 rounded-full bg-gray-200">
                          <div
                            className="h-2 rounded-full bg-blue-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="border-b p-3 text-sm text-gray-600">
                      {(v.lastPosition || 0).toFixed(1)} sec
                    </td>
                    <td className="border-b p-3 text-sm text-gray-600">
                      {v.completed ? (
                        <span className="flex items-center text-green-600">
                          Terminé <CheckCircle className="ml-1 h-4 w-4" />
                        </span>
                      ) : (
                        <span className="text-orange-600">En cours</span>
                      )}
                    </td>
                    <td className="border-b p-3 text-sm text-gray-600">
                      {v.updatedAt?.toDate().toLocaleString() || "N/A"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
