"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, doc, getDocs, setDoc, deleteDoc } from "firebase/firestore";

interface DefaultImage {
  id: string;
  url: string;
}

export default function DefaultImg() {
  const [keyName, setKeyName] = useState("");
  const [imgUrl, setImgUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [defaultImages, setDefaultImages] = useState<DefaultImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const collectionRef = collection(db, "defaultCourseImages");

  useEffect(() => {
    fetchDefaultImages();
  }, []);

  async function fetchDefaultImages() {
    setLoading(true);
    try {
      const snapshot = await getDocs(collectionRef);
      const imgs: DefaultImage[] = [];
      snapshot.forEach(docSnap => {
        imgs.push({ id: docSnap.id, url: docSnap.data().url });
      });
      setDefaultImages(imgs);
    } catch (error) {
      console.error("Erreur récupération images par défaut :", error);
      setMessage("Erreur lors du chargement des images.");
    }
    setLoading(false);
  }

  function handleEdit(img: DefaultImage) {
    setEditingId(img.id);
    setKeyName(img.id);
    setImgUrl(img.url);
  }

  function handleCancelEdit() {
    setEditingId(null);
    setKeyName("");
    setImgUrl("");
    setMessage("");
  }

  async function handleDelete(id: string) {
    if (!confirm(`Supprimer l'image "${id}" ?`)) return;
    try {
      await deleteDoc(doc(db, "defaultCourseImages", id));
      setMessage(`Image "${id}" supprimée.`);
      setDefaultImages(prev => prev.filter(img => img.id !== id));
    } catch (error) {
      console.error("Erreur suppression :", error);
      setMessage("Erreur lors de la suppression.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!keyName.trim() || !imgUrl.trim()) {
      setMessage("Merci de remplir tous les champs.");
      return;
    }

    try {
      await setDoc(doc(db, "defaultCourseImages", keyName.trim().toLowerCase()), {
        url: imgUrl.trim(),
      });
      setMessage(editingId
        ? `Image "${keyName}" mise à jour !`
        : `Image "${keyName}" enregistrée !`
      );
      setKeyName("");
      setImgUrl("");
      setEditingId(null);
      fetchDefaultImages();
    } catch (error) {
      console.error("Erreur enregistrement image :", error);
      setMessage("Erreur lors de l'enregistrement.");
    }
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      <h2 className="text-xl font-bold mb-4">Images par défaut des cours</h2>

      <form onSubmit={handleSubmit} className="mb-6 space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">
            Clé (ex: maths, physique, default)
          </label>
          <input
            type="text"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            placeholder="Clé de l'image par défaut"
            disabled={!!editingId}
            className="w-full border rounded px-3 py-2 text-sm disabled:bg-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            URL de l'image SVG
          </label>
          <input
            type="url"
            value={imgUrl}
            onChange={(e) => setImgUrl(e.target.value)}
            placeholder="https://exemple.com/image.svg"
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>

        <div className="flex gap-2">
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
            {editingId ? "Mettre à jour" : "Enregistrer"}
          </button>
          {editingId && (
            <button type="button" onClick={handleCancelEdit} className="px-4 py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300">
              Annuler
            </button>
          )}
        </div>
      </form>

      {message && <p className="mb-4 text-sm text-gray-700">{message}</p>}

      <h3 className="font-semibold mb-3">Images existantes</h3>
      {loading ? (
        <p className="text-sm text-gray-500">Chargement...</p>
      ) : (
        <ul className="space-y-4">
          {defaultImages.map(({ id, url }) => (
            <li key={id} className="border-b pb-4">
              <div className="flex justify-between items-center mb-2">
                <b className="text-sm">{id}</b>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit({ id, url })}
                    className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(id)}
                    className="px-3 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
              <img src={url} alt={id} className="max-w-[200px] h-auto border border-gray-200 rounded" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
