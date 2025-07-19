"use client";
import { useState, useEffect } from "react";
import { db } from "@/firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes } from "firebase/storage";

export default function VideoForm() {
  const [title, setTitle] = useState("");
  const [order, setOrder] = useState(1);
  const [courseId, setCourseId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [courses, setCourses] = useState<any[]>([]);

  // Charger la liste des cours (pour select)
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "courses"));
      setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    })();
  }, []);

  // Gestion de l'envoi du formulaire
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError(""); setSuccess("");

    if (!title.trim() || !courseId || !file) {
      setError("Tous les champs sont obligatoires.");
      return;
    }

    setUploading(true);

    try {
      const storage = getStorage();
      const storagePath = `videos/${courseId}/${Date.now()}_${file.name.replace(/[^\w.]/g, "_")}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);

      // Ajouter les infos dans Firestore
      await addDoc(collection(db, "videos"), {
        title,
        order: Number(order),
        course_id: courseId,
        storage_path: storagePath,
        created_at: new Date(),
      });

      setSuccess("Vidéo ajoutée avec succès !");
      setTitle(""); setOrder(1); setCourseId(""); setFile(null);
    } catch (err: any) {
      setError("Erreur lors de l’upload : " + (err.message || err));
    }

    setUploading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 mb-4 max-w-md">
      <input
        className="border px-3 py-2 rounded"
        type="text"
        placeholder="Titre de la vidéo"
        value={title}
        onChange={e => setTitle(e.target.value)}
        required
      />
      <input
        className="border px-3 py-2 rounded"
        type="number"
        placeholder="Ordre"
        value={order}
        min={1}
        onChange={e => setOrder(Number(e.target.value))}
        required
      />
      <select
        className="border px-3 py-2 rounded"
        value={courseId}
        onChange={e => setCourseId(e.target.value)}
        required
      >
        <option value="">Choisir un cours</option>
        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
      </select>
      <input
        className="border px-3 py-2 rounded"
        type="file"
        accept="video/*"
        onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
        required
      />
      <button className="bg-blue-600 text-white px-4 py-2 rounded" type="submit" disabled={uploading}>
        {uploading ? "Uploading..." : "Ajouter la vidéo"}
      </button>
      {error && <div className="text-red-600">{error}</div>}
      {success && <div className="text-green-600">{success}</div>}
    </form>
  );
}
