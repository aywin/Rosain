"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function ProfileForm() {
  const [form, setForm] = useState({ nom: "", prenom: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setForm({ nom: data.nom, prenom: data.prenom, email: data.email });
        }
      }
      setLoading(false);
    };
    fetchUserData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (user) {
      try {
        const docRef = doc(db, "users", user.uid);
        await updateDoc(docRef, {
          nom: form.nom,
          prenom: form.prenom,
        });
        setMessage("Profil mis à jour avec succès !");
      } catch (error) {
        setMessage("Erreur lors de la mise à jour.");
      }
    }
  };

  if (loading) return <p className="text-center mt-10">Chargement...</p>;

  return (
    <form
      onSubmit={handleUpdate}
      className="bg-white shadow-md rounded-lg p-6 w-full max-w-md mx-auto"
    >
      <h2 className="text-xl font-semibold mb-4 text-center">Mon profil</h2>
      <div className="mb-3">
        <label className="block text-sm font-medium">Nom</label>
        <input
          type="text"
          name="nom"
          value={form.nom}
          onChange={handleChange}
          className="input w-full"
          required
        />
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium">Prénom</label>
        <input
          type="text"
          name="prenom"
          value={form.prenom}
          onChange={handleChange}
          className="input w-full"
          required
        />
      </div>
      <div className="mb-3">
        <label className="block text-sm font-medium">Email</label>
        <input
          type="email"
          value={form.email}
          disabled
          className="input w-full bg-gray-100 cursor-not-allowed"
        />
      </div>

      <button
        type="submit"
        className="bg-blue-700 text-white px-4 py-2 rounded w-full hover:bg-blue-800"
      >
        Mettre à jour
      </button>

      {message && (
        <p className="text-center mt-3 text-sm text-green-600">{message}</p>
      )}
    </form>
  );
}
