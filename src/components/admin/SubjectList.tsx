"use client";
import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import SubjectForm from "./SubjectForm";

export default function SubjectList() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    fetchList();
  }, []);

  const fetchList = async () => {
    const snap = await getDocs(collection(db, "subjects"));
    setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const handleAdd = async (name: string) => {
    await addDoc(collection(db, "subjects"), { name });
    await fetchList();
  };

  const handleEdit = async (id: string, name: string) => {
    await updateDoc(doc(db, "subjects", id), { name });
    setEditing(null);
    await fetchList();
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "subjects", id));
    setSubjects(subjects.filter(s => s.id !== id));
  };

  return (
    <div>
      <SubjectForm onSubmit={handleAdd} />
      <ul>
        {subjects.map(s => (
          <li key={s.id} className="mb-3 flex items-center justify-between bg-white p-3 rounded shadow">
            {editing === s.id ? (
              <SubjectForm
                onSubmit={(name) => handleEdit(s.id, name)}
                initialValue={s.name}
                editMode
                onCancel={() => setEditing(null)}
              />
            ) : (
              <>
                <span className="font-medium">{s.name}</span>
                <div>
                  <button
                    className="text-blue-700 underline mr-2"
                    onClick={() => setEditing(s.id)}
                  >Edit</button>
                  <button
                    className="text-red-600 underline"
                    onClick={() => handleDelete(s.id)}
                  >Delete</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
