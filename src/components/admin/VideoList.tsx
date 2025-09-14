'use client';

import { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const playerRef = useRef<HTMLDivElement>(null);

  // Sync interne quand props changent
  useEffect(() => {
    setItems(videos || []);
    setSelectedVideoId(null);
    setEditingId(null);
  }, [videos, courseId]);

  const handleOrderChange = async (id: string, newOrder: number) => {
    const ref = doc(db, 'videos', id);
    await updateDoc(ref, { order: newOrder });
    setItems((prev) =>
      prev.map((v) => (v.id === id ? { ...v, order: newOrder } : v))
    );
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
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette vidéo ?')) return;
    await deleteDoc(doc(db, 'videos', id));
    setItems((prev) => prev.filter((v) => v.id !== id));
  };

  const handleEdit = (video: Video) => {
    setEditingId(video.id);
    setEditTitle(video.title);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editTitle.trim()) return;
    await updateDoc(doc(db, 'videos', id), { title: editTitle });
    setItems((prev) =>
      prev.map((v) => (v.id === id ? { ...v, title: editTitle } : v))
    );
    setEditingId(null);
    setEditTitle('');
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (playerRef.current && !playerRef.current.contains(e.target as Node)) {
      setSelectedVideoId(null);
    }
  };

  useEffect(() => {
    if (selectedVideoId) {
      document.addEventListener('click', handleClickOutside);
    } else {
      document.removeEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [selectedVideoId]);

  if (!courseId) return <p>Sélectionnez un cours pour voir ses vidéos</p>;
  if (!videos.length) return <p>Aucune vidéo pour ce cours</p>;

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="videos">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
            {items.map((video, index) => (
              <div key={video.id}>
                {/* Afficher le lecteur au-dessus */}
                {selectedVideoId === video.id && (
                  <div ref={playerRef} className="mb-2 relative border rounded p-2 bg-gray-50">
                    <button
                      onClick={() => setSelectedVideoId(null)}
                      className="absolute top-1 right-1 text-red-500 font-bold"
                    >
                      ✖
                    </button>
                    <AdminVideoPlayer video={video} />
                  </div>
                )}

                <Draggable draggableId={video.id} index={index}>
                  {(prov) => (
                    <div
                      ref={prov.innerRef}
                      {...prov.draggableProps}
                      {...prov.dragHandleProps}
                      className="flex items-center justify-between border p-2 rounded bg-white shadow-sm"
                    >
                      {editingId === video.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleSaveEdit(video.id);
                          }}
                          className="flex-1 flex gap-2"
                        >
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="border p-1 flex-1 rounded"
                            autoFocus
                          />
                          <button type="submit" className="bg-green-600 text-white px-2 rounded">
                            ✅
                          </button>
                        </form>
                      ) : (
                        <button
                          onClick={() =>
                            setSelectedVideoId(
                              selectedVideoId === video.id ? null : video.id
                            )
                          }
                          className={`font-medium text-left flex-1 ${
                            selectedVideoId === video.id
                              ? 'text-blue-600 underline'
                              : 'text-gray-800 hover:text-blue-500'
                          }`}
                        >
                          {video.title}
                        </button>
                      )}

                      <input
                        type="number"
                        value={video.order || ''}
                        onChange={(e) => handleOrderChange(video.id, Number(e.target.value))}
                        className="w-16 border p-1 rounded text-center ml-2"
                      />

                      <div className="flex gap-2 ml-2">
                        <button
                          onClick={() => handleEdit(video)}
                          className="text-yellow-600 hover:underline"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(video.id)}
                          className="text-red-600 hover:underline"
                        >
                          🗑️
                        </button>
                      </div>
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
