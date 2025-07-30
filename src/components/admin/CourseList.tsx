"use client";
import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import CourseForm from "./CourseForm";

export default function CourseList() {
  const [courses, setCourses] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editInitial, setEditInitial] = useState<any>({});

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    await fetchList();
    await fetchRefs();
    await fetchVideos();
  };

  const fetchList = async () => {
    const snap = await getDocs(collection(db, "courses"));
    setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const fetchRefs = async () => {
    const levelsSnap = await getDocs(collection(db, "levels"));
    setLevels(levelsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    const subjectsSnap = await getDocs(collection(db, "subjects"));
    setSubjects(subjectsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const fetchVideos = async () => {
    const videosSnap = await getDocs(collection(db, "videos"));
    setVideos(videosSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const getLevelName = (id: string) => levels.find(l => l.id === id)?.name || id;
  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.name || id;
  const getVideosForCourse = (courseId: string) =>
  videos.filter(v => v.courseId === courseId);


  const handleAdd = async (data: any) => {
    await addDoc(collection(db, "courses"), {
      ...data,
      created_at: new Date(),
    });
    await fetchList();
  };

  const handleEdit = async (id: string, data: any) => {
    await updateDoc(doc(db, "courses", id), data);
    setEditing(null); setEditInitial({});
    await fetchList();
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "courses", id));
    setCourses(courses.filter(c => c.id !== id));
  };

  return (
    <div>
      <CourseForm onSubmit={handleAdd} />
      <ul>
        {courses.map(c => (
          <li key={c.id} className="mb-3 bg-white p-3 rounded shadow flex flex-col gap-2">
            {editing === c.id ? (
              <CourseForm
                onSubmit={data => handleEdit(c.id, data)}
                initial={editInitial}
                editMode
                onCancel={() => { setEditing(null); setEditInitial({}); }}
              />
            ) : (
              <>
                <div className="font-bold">{c.title}</div>
                <div className="text-sm text-gray-500">{c.description}</div>
                <div className="text-xs text-gray-600">
                  Level: {getLevelName(c.level_id)} | Subject: {getSubjectName(c.subject_id)}
                </div>
                {/* Liste des vidéos associées */}
                <div className="mt-2">
                  <span className="font-semibold text-sm">Videos :</span>
                  <ul className="ml-3 list-disc">
                    {getVideosForCourse(c.id).length === 0
                      ? <li className="text-gray-400 italic">No video yet</li>
                      : getVideosForCourse(c.id)
                          .sort((a, b) => (a.order || 0) - (b.order || 0))
                          .map(v => (
                            <li key={v.id} className="text-gray-700">{v.url}</li>
                          ))
                    }
                  </ul>
                </div>
                <div>
                  <button className="text-blue-700 underline mr-2" onClick={() => { setEditing(c.id); setEditInitial(c); }}>Edit</button>
                  <button className="text-red-600 underline" onClick={() => handleDelete(c.id)}>Delete</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
