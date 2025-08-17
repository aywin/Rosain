'use client';

import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import AdminVideoPlayer from './AdminVideoPlayer';

interface Video {
  id: string;
  title: string;
  url: string;
  courseId: string;
  order?: number;
}

interface VideoListProps {
  videos: Video[];
  courseId: string;
  refreshVideos: (id: string) => void;
}

export default function VideoList({ videos, courseId, refreshVideos }: VideoListProps) {
  const [items, setItems] = useState<Video[]>(videos);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  // 🔧 Sync interne quand les props changent
  useEffect(() => {
    setItems(videos || []);
    setSelectedVideoId(null); // reset du lecteur si on change de cours
  }, [videos, courseId]);

  const handleOrderChange = async (id: string, newOrder: number) => {
    const ref = doc(db, 'videos', id);
    await updateDoc(ref, { order: newOrder });
    refreshVideos(courseId);
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const reordered = Array.from(items);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    const updates = reordered.map((v, index) => ({ ...v, order: index + 1 }));
    setItems(updates);

    for (const v of updates) {
      const ref = doc(db, 'videos', v.id);
      await updateDoc(ref, { order: v.order });
    }

    refreshVideos(courseId);
  };

  if (!courseId) return <p>Sélectionnez un cours pour voir ses vidéos</p>;
  if (!videos.length) return <p>Aucune vidéo pour ce cours</p>;

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="videos">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
            {items.map((video, index) => (
              <div key={video.id}>
                {/* Afficher le lecteur au-dessus de la vidéo cliquée */}
                {selectedVideoId === video.id && <AdminVideoPlayer video={video} />}

                <Draggable draggableId={video.id} index={index}>
                  {(prov) => (
                    <div
                      ref={prov.innerRef}
                      {...prov.draggableProps}
                      {...prov.dragHandleProps}
                      className="flex items-center justify-between border p-2 rounded bg-white shadow-sm"
                    >
                      <button
                        onClick={() =>
                          setSelectedVideoId(selectedVideoId === video.id ? null : video.id)
                        }
                        className="text-blue-600 hover:underline font-medium text-left flex-1"
                      >
                        {video.title}
                      </button>

                      <input
                        type="number"
                        value={video.order || ''}
                        onChange={(e) => handleOrderChange(video.id, Number(e.target.value))}
                        className="w-16 border p-1 rounded text-center ml-2"
                      />
                    </div>
                  )}
                </Draggable>
              </div>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
