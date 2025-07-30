"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import YouTube, { YouTubePlayer } from "react-youtube";

interface Course {
  id: string;
  title: string;
}

interface Video {
  id: string;
  title: string;
  url: string;
}

export default function TestPage() {
  const [courses, setCourses] = useState<{
    course: Course;
    videos: Video[];
  }[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [player, setPlayer] = useState<YouTubePlayer | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const courseSnapshot = await getDocs(collection(db, "courses"));
      const courseList: Course[] = courseSnapshot.docs.map((doc) => ({
        id: doc.id,
        title: doc.data().title || "Sans titre",
      }));

      const courseWithVideos = await Promise.all(
        courseList.map(async (course) => {
          const videoSnapshot = await getDocs(
            query(collection(db, "videos"), where("courseId", "==", course.id))
          );
          const videos: Video[] = videoSnapshot.docs.map((doc) => ({
            id: doc.id,
            title: doc.data().title || "Titre inconnu",
            url: doc.data().url || "",
          }));
          return { course, videos };
        })
      );

      setCourses(courseWithVideos);
    };

    fetchData();
  }, []);

  const handleVideoPlay = (event: { target: YouTubePlayer }) => {
    const ytPlayer = event.target;
    setPlayer(ytPlayer);

    // Vérifie chaque seconde si on dépasse 60s
    const interval = setInterval(() => {
      if (ytPlayer.getCurrentTime() >= 60) {
        ytPlayer.pauseVideo();
        setShowPrompt(true);
        clearInterval(interval);
      }
    }, 1000);
  };

  const handleContinue = () => {
    player?.playVideo();
    setShowPrompt(false);
  };

  const getYouTubeId = (url: string): string | null => {
    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-72 border-r p-4 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Cours</h2>
        {courses.map(({ course, videos }) => (
          <div key={course.id} className="mb-6">
            <h3 className="font-medium text-blue-700 mb-2">{course.title}</h3>
            <ul className="pl-2 space-y-1">
              {videos.map((video) => (
                <li key={video.id}>
                  <button
                    onClick={() => setSelectedVideo(video)}
                    className="text-left text-sm text-blue-600 hover:underline"
                  >
                    {video.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Video Player */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {selectedVideo ? (
          <div className="w-full max-w-4xl">
            <h2 className="text-xl font-bold mb-4">{selectedVideo.title}</h2>
            <YouTube
              videoId={getYouTubeId(selectedVideo.url) || ""}
              opts={{
                width: "100%",
                height: "500",
                playerVars: {
                  autoplay: 1,
                },
              }}
              onReady={handleVideoPlay}
            />

            {showPrompt && (
              <div className="mt-4 bg-yellow-100 border border-yellow-400 p-4 rounded shadow">
                <p className="mb-2 font-medium">
                  Voulez-vous continuer après cette première minute ?
                </p>
                <button
                  onClick={handleContinue}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Oui, continuer la vidéo
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500">Sélectionnez une vidéo à gauche</p>
        )}
      </div>
    </div>
  );
}
