'use client';

interface Video {
  id: string;
  title: string;
  url: string;
  courseId: string;
  order?: number;
}

interface AdminVideoPlayerProps {
  video: Video;
}

export default function AdminVideoPlayer({ video }: AdminVideoPlayerProps) {
  const getYouTubeId = (url: string) => {
    const regExp = /(?:youtube\.com.*(?:\?|&)v=|youtu\.be\/)([^&#]+)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  const videoId = getYouTubeId(video.url);
  if (!videoId) return <p className="text-red-500">URL YouTube invalide</p>;

  return (
    <div className="flex justify-center mb-4">
      <div className="w-[400px] aspect-video rounded-lg overflow-hidden shadow">
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${videoId}`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    </div>
  );
}
