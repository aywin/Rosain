// QuizMetaForm.tsx
"use client";

import { Course, Video } from "./types";

interface QuizMetaFormProps {
  courses: Course[];
  videos: Video[];
  selectedCourse: string;
  setSelectedCourse: (id: string) => void;
  selectedVideo: string;
  setSelectedVideo: (id: string) => void;
  minute: string;
  setMinute: (val: string) => void;
  second: string;
  setSecond: (val: string) => void;
}

export default function QuizMetaForm({
  courses,
  videos,
  selectedCourse,
  setSelectedCourse,
  selectedVideo,
  setSelectedVideo,
  minute,
  setMinute,
  second,
  setSecond,
}: QuizMetaFormProps) {
  return (
    <>
      <label className="block mb-2 font-semibold">Cours</label>
      <select
        value={selectedCourse}
        onChange={(e) => setSelectedCourse(e.target.value)}
        className="border rounded p-2 w-full mb-4"
      >
        <option value="">-- Sélectionnez un cours --</option>
        {courses.map((course) => (
          <option key={course.id} value={course.id}>
            {course.title}
          </option>
        ))}
      </select>

      {videos.length > 0 && (
        <>
          <label className="block mb-2 font-semibold">Vidéo</label>
          <select
            value={selectedVideo}
            onChange={(e) => setSelectedVideo(e.target.value)}
            className="border rounded p-2 w-full mb-4"
          >
            <option value="">-- Sélectionnez une vidéo --</option>
            {videos.map((video) => (
              <option key={video.id} value={video.id}>
                {video.title}
              </option>
            ))}
          </select>
        </>
      )}

      {selectedVideo && (
        <>
          <label className="block mb-2 font-semibold">
            Moment d'apparition du quiz
          </label>
          <div className="flex gap-2 mb-4">
            <input
              type="number"
              placeholder="Minutes"
              value={minute}
              min={0}
              onChange={(e) => setMinute(e.target.value)}
              className="border rounded p-2 w-1/2"
            />
            <input
              type="number"
              placeholder="Secondes"
              value={second}
              min={0}
              max={59}
              onChange={(e) => setSecond(e.target.value)}
              className="border rounded p-2 w-1/2"
            />
          </div>
        </>
      )}
    </>
  );
}
