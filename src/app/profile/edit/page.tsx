// app/profile/edit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";

interface UserData {
  nom: string;
  prenom: string;
  email: string;
  role: "eleve" | "parent" | "autre";
  id_ecole?: string | null;
  level?: string | null;
  pupils?: string[]; // ✅ remplacé enfants → pupils
}

interface Level {
  id: string;
  name: string;
}

export default function EditProfilePage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [newPupil, setNewPupil] = useState(""); // ✅ renommé
  const router = useRouter();

  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    id_ecole: "",
    level: "",
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      try {
        // 🔹 Charger infos utilisateur
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data() as UserData;
          setUserData(data);
          setForm({
            nom: data.nom,
            prenom: data.prenom,
            email: data.email,
            id_ecole: data.id_ecole || "",
            level: data.level || "",
          });
        }

        // 🔹 Charger les niveaux
        const levelsSnap = await getDocs(collection(db, "levels"));
        const levelList = levelsSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as { name: string }),
        }));
        setLevels(levelList);
      } catch (err) {
        console.error(err);
        setError("Impossible de charger les informations.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Utilisateur non connecté");

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        nom: form.nom,
        prenom: form.prenom,
        email: form.email,
        id_ecole: form.id_ecole || null,
        level: userData?.role === "eleve" ? form.level || null : null,
      });

      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddPupil = async () => {
    if (!newPupil.trim()) return;
    try {
      const user = auth.currentUser;
      if (!user) return;
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        pupils: arrayUnion(newPupil.trim()), // ✅ remplacé
      });
      setUserData((prev) =>
        prev ? { ...prev, pupils: [...(prev.pupils || []), newPupil.trim()] } : prev
      );
      setNewPupil("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemovePupil = async (pupil: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        pupils: arrayRemove(pupil), // ✅ remplacé
      });
      setUserData((prev) =>
        prev
          ? { ...prev, pupils: (prev.pupils || []).filter((c) => c !== pupil) }
          : prev
      );
    } catch (err) {
      console.error(err);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600 animate-pulse">
        Chargement...
      </div>
    );

  if (!userData)
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500">
        Utilisateur introuvable
      </div>
    );

  return (
    <div className="min-h-screen p-6 bg-gray-100 flex items-center justify-center">
      <div className="bg-white w-full max-w-3xl rounded-lg shadow-lg p-8 space-y-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Configuration du profil
        </h1>

        {error && <p className="text-red-500">{error}</p>}
        {success && (
          <p className="text-green-600">Profil mis à jour avec succès !</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nom et prénom */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Prénom
              </label>
              <input
                type="text"
                name="prenom"
                value={form.prenom}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded focus:ring focus:ring-blue-300"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Nom</label>
              <input
                type="text"
                name="nom"
                value={form.nom}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded focus:ring focus:ring-blue-300"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded focus:ring focus:ring-blue-300"
              required
            />
          </div>

          {/* Select niveau pour élève */}
          {userData.role === "eleve" && (
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Niveau
              </label>
              <select
                name="level"
                value={form.level}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded focus:ring focus:ring-blue-300"
                required
              >
                <option value="">-- Choisir un niveau --</option>
                {levels.map((lvl) => (
                  <option key={lvl.id} value={lvl.name}>
                    {lvl.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* École pour non-élèves */}
          {userData.role !== "eleve" && (
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                École / Structure
              </label>
              <input
                type="text"
                name="id_ecole"
                value={form.id_ecole}
                onChange={handleChange}
                className="w-full border px-3 py-2 rounded focus:ring focus:ring-blue-300"
              />
            </div>
          )}

          {/* Bouton sauvegarde */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
            >
              {saving ? "Sauvegarde..." : "Enregistrer"}
            </button>
          </div>
        </form>

        {/* Section pupils pour parents */}
        {userData.role === "parent" && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Mes pupils
            </h2>

            <div className="space-y-2">
              {(userData.pupils || []).map((pupil, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-gray-50 border p-2 rounded"
                >
                  <span>{pupil}</span>
                  <button
                    onClick={() => handleRemovePupil(pupil)}
                    className="text-red-600 hover:underline text-sm"
                  >
                    Supprimer
                  </button>
                </div>
              ))}
            </div>

            <div className="flex mt-4 space-x-2">
              <input
                type="text"
                placeholder="Nom du pupil"
                value={newPupil}
                onChange={(e) => setNewPupil(e.target.value)}
                className="flex-1 border px-3 py-2 rounded focus:ring focus:ring-blue-300"
              />
              <button
                onClick={handleAddPupil}
                className="bg-green-600 text-white px-4 rounded hover:bg-green-700"
              >
                Ajouter
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
