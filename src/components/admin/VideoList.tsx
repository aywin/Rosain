'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase';

interface Props {
  courseId: string;
  refresh: boolean;
}

interface Video {
  id: string;
  title: string;
  url: string;
  courseId: string;
}

const VideoList = ({ courseId, refresh }: Props) => {
  const [videos, setVideos] = useState<Video[]>([]);

  const fetchVideos = async () => {
    const q = query(collection(db, 'videos'), where('courseId', '==', courseId));
    const snapshot = await getDocs(q);
    const data: Video[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Video, 'id'>),
    }));
    setVideos(data);
  };

  useEffect(() => {
    if (courseId) fetchVideos();
  }, [courseId, refresh]);

  if (!courseId) return null;

  return (
    <div className="space-y-6">
      {videos.length > 0 ? (
        videos.map((video) => (
          <div key={video.id} className="border p-4 rounded">
            <h3 className="font-semibold">{video.title}</h3>
            <div className="aspect-video mt-2">
              <iframe
                className="w-full h-full"
                src={video.url.replace('watch?v=', 'embed/')}
                title={video.title}
                allowFullScreen
              ></iframe>
            </div>
          </div>
        ))
      ) : (
        <p className="text-gray-500">Aucune vidéo pour ce cours.</p>
      )}
    </div>
  );
};

export default VideoList;
