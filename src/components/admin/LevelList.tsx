"use client";
import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import LevelForm from "./LevelForm";

interface Level {
  id: string;
  name: string;
}

export default function LevelList() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    fetchList();
  }, []);

  const fetchList = async () => {
    const snap = await getDocs(collection(db, "levels"));
    setLevels(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Level)));
  };

  const handleAdd = async (name: string) => {
    await addDoc(collection(db, "levels"), { name });
    await fetchList();
  };

  const handleEdit = async (id: string, name: string) => {
    await updateDoc(doc(db, "levels", id), { name });
    setEditing(null);
    await fetchList();
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "levels", id));
    setLevels(levels.filter((l) => l.id !== id));
  };

  return (
    <div>
      <LevelForm onSubmit={handleAdd} />
      <ul>
        {levels.map((l) => (
          <li key={l.id} className="mb-3 flex items-center justify-between bg-white p-3 rounded shadow">
            {editing === l.id ? (
              <LevelForm
                onSubmit={(name) => handleEdit(l.id, name)}
                initialValue={l.name}
                editMode
                onCancel={() => setEditing(null)}
              />
            ) : (
              <>
                <span className="font-medium">{l.name}</span>
                <div>
                  <button
                    className="text-blue-700 underline mr-2"
                    onClick={() => setEditing(l.id)}
                  >
                    Modifier
                  </button>
                  <button
                    className="text-red-600 underline"
                    onClick={() => handleDelete(l.id)}
                  >
                    Supprimer
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}