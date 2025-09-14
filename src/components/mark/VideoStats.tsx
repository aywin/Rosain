// components/mark/VideoStats.tsx
"use client";
import React from "react";
import { Video as VideoIcon, AlertTriangle, CheckCircle } from "lucide-react";
import { VideoProgress } from "@/utils/progress";
import { getVideoSuggestion } from "@/utils/progress";

interface Props {
  videos: VideoProgress[];
  videoTitles: Record<string, string>;
  videoStats: {
    completed: number;
    started: number;
    notStarted: number;
    percent: number;
    totalMinutesRemaining: number;
  };
}

export default function VideoStats({ videos, videoTitles, videoStats }: Props) {
  const suggestion = getVideoSuggestion(videoStats.percent);

  return (
    <div className="rounded-lg bg-blue-50 p-4">
      <div className="mb-2 flex items-center space-x-2">
        <VideoIcon className="h-5 w-5 text-blue-600" />
        <h3 className="text-xl font-medium text-gray-800">Résumé vidéos</h3>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded bg-green-100 p-3 text-center">
          <p className="text-sm text-gray-600">Terminées</p>
          <p className="text-2xl font-bold text-green-600">{videoStats.completed}</p>
        </div>
        <div className="rounded bg-orange-100 p-3 text-center">
          <p className="text-sm text-gray-600">Commencées</p>
          <p className="text-2xl font-bold text-orange-600">{videoStats.started}</p>
        </div>
        <div className="rounded bg-red-100 p-3 text-center">
          <p className="text-sm text-gray-600">Non commencées</p>
          <p className="text-2xl font-bold text-red-600">{videoStats.notStarted}</p>
        </div>
      </div>

      <p className="mt-4 text-sm text-gray-600">
        Temps restant estimé : {Number(videoStats.totalMinutesRemaining || 0).toFixed(0)} min
      </p>

      <p className="mt-2 flex items-center text-sm text-gray-700">
        <AlertTriangle className="mr-2 h-4 w-4 text-blue-500" />
        {suggestion}
      </p>

      {/* Détails vidéos */}
      <div className="mt-4">
        <h4 className="text-lg font-medium text-gray-800 mb-2">Détails vidéos</h4>
        {videos.length === 0 ? (
          <p className="text-gray-500">Aucun progrès vidéo enregistré.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-gray-50 p-4">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-blue-100">
                  <th className="border-b p-3 text-left text-sm font-semibold text-gray-700">Vidéo</th>
                  <th className="border-b p-3 text-left text-sm font-semibold text-gray-700">Temps regardé (min)</th>
                  <th className="border-b p-3 text-left text-sm font-semibold text-gray-700">Dernière position (sec)</th>
                  <th className="border-b p-3 text-left text-sm font-semibold text-gray-700">Terminé</th>
                  <th className="border-b p-3 text-left text-sm font-semibold text-gray-700">Date</th>
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
                        {videoTitles[v.videoId || ""] || v.videoId || v.id}
                      </td>
                      <td className="border-b p-3 text-sm text-gray-600">
                        <div className="flex items-center">
                          {watched.toFixed(2)} min
                          <div className="ml-2 h-2 w-24 rounded-full bg-gray-200">
                            <div
                              className="h-2 rounded-full bg-blue-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="border-b p-3 text-sm text-gray-600">{(v.lastPosition || 0).toFixed(2)} sec</td>
                      <td className="border-b p-3 text-sm text-gray-600">
                        {v.completed ? (
                          <span className="flex items-center text-green-600">
                            Oui <CheckCircle className="ml-1 h-4 w-4" />
                          </span>
                        ) : (
                          <span className="text-orange-600">Non</span>
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
        )}
      </div>
    </div>
  );
}
