"use client";
import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import VideoForm from "./VideoForm";

export default function VideoList() {
  const [videos, setVideos] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editInitial, setEditInitial] = useState<any>({});

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    await fetchList();
    await fetchCourses();
  };

  const fetchList = async () => {
    const snap = await getDocs(collection(db, "videos"));
    setVideos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const fetchCourses = async () => {
    const coursesSnap = await getDocs(collection(db, "courses"));
    setCourses(coursesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const getCourseTitle = (id: string) => courses.find(c => c.id === id)?.title || id;

  const handleAdd = async (data: any) => {
    await addDoc(collection(db, "videos"), {
      ...data,
      created_at: new Date(),
    });
    await fetchList();
  };

  const handleEdit = async (id: string, data: any) => {
    await updateDoc(doc(db, "videos", id), data);
    setEditing(null); setEditInitial({});
    await fetchList();
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "videos", id));
    setVideos(videos.filter(v => v.id !== id));
  };

  return (
    <div>
      <VideoForm onSubmit={handleAdd} />
      <ul>
        {videos.map(v => (
          <li key={v.id} className="mb-3 bg-white p-3 rounded shadow flex flex-col gap-2">
            {editing === v.id ? (
              <VideoForm
                onSubmit={data => handleEdit(v.id, data)}
                initial={editInitial}
                editMode
                onCancel={() => { setEditing(null); setEditInitial({}); }}
              />
            ) : (
              <>
                <div className="font-bold">{v.title}</div>
                <div className="text-xs text-gray-500">
                  Order: {v.order} | Course: {getCourseTitle(v.course_id)}
                </div>
                <div className="text-xs text-gray-400">
                  Storage: {v.storage_path}
                </div>
                <div>
                  <button className="text-blue-700 underline mr-2" onClick={() => { setEditing(v.id); setEditInitial(v); }}>Edit</button>
                  <button className="text-red-600 underline" onClick={() => handleDelete(v.id)}>Delete</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
