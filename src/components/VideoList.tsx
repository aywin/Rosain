"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";

export default function VideoList() {
  const [videos, setVideos] = useState<string[]>([]);
  const courseId = "FIRESTORE_COURSE_ID"; // adapter dynamiquement plus tard

  useEffect(() => {
    const fetchVideos = async () => {
      const snap = await getDocs(collection(db, "courses", courseId, "videos"));
      const urls = snap.docs.map((doc) => doc.data().url);
      setVideos(urls);
    };
    fetchVideos();
  }, []);

  return (
    <div>
      <h2>Vidéos du cours</h2>
      {videos.map((url, idx) => (
        <div key={idx} className="mb-4">
          <video controls width="400">
            <source src={url} type="video/mp4" />
          </video>
        </div>
      ))}
    </div>
  );
}
