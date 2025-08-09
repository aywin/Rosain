"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/firebase"; // adapte selon ton fichier firebase
import { collection, doc, getDocs, setDoc } from "firebase/firestore";

interface DefaultImage {
  id: string;
  url: string;
}

export default function DefaultImg() {
  const [keyName, setKeyName] = useState("");
  const [imgUrl, setImgUrl] = useState("");
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
      setMessage(`Image pour "${keyName}" enregistrée avec succès !`);
      setKeyName("");
      setImgUrl("");
      fetchDefaultImages(); // rafraichir la liste
    } catch (error) {
      console.error("Erreur enregistrement image :", error);
      setMessage("Erreur lors de l'enregistrement.");
    }
  }

  return (
    <div style={{ maxWidth: 500, margin: "auto", padding: 20 }}>
      <h2>Images par défaut des cours (Default Images)</h2>

      <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 10 }}>
          <label>
            Clé (ex: maths, physique, default) : <br />
            <input
              type="text"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="Clé de l'image par défaut"
              style={{ width: "100%", padding: 8 }}
            />
          </label>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>
            URL de l'image SVG : <br />
            <input
              type="url"
              value={imgUrl}
              onChange={(e) => setImgUrl(e.target.value)}
              placeholder="https://exemple.com/image.svg"
              style={{ width: "100%", padding: 8 }}
            />
          </label>
        </div>

        <button type="submit" style={{ padding: "8px 16px" }}>
          Enregistrer
        </button>
      </form>

      {message && <p>{message}</p>}

      <h3>Images par défaut existantes</h3>
      {loading ? (
        <p>Chargement...</p>
      ) : (
        <ul>
          {defaultImages.map(({ id, url }) => (
            <li key={id} style={{ marginBottom: 10 }}>
              <b>{id}</b>: <br />
              <img src={url} alt={id} style={{ maxWidth: 200, height: "auto", border: "1px solid #ccc" }} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
