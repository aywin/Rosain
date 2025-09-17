// app/profile/edit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/firebase";
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";

interface UserData {
  nom: string;
  prenom: string;
  email: string;
  role: "eleve" | "parent" | "autre";
  statut_paiement: boolean;
  id_ecole?: string | null;
  level?: string | null; // stocke l'id du level
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
  const router = useRouter();

  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    statut_paiement: false,
    id_ecole: "",
    level: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) {
        router.push("/login");
        return;
      }
      try {
        // Récupérer l'utilisateur
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data() as UserData;
          setUserData(data);
          setForm({
            nom: data.nom,
            prenom: data.prenom,
            email: data.email,
            statut_paiement: data.statut_paiement,
            id_ecole: data.id_ecole || "",
            level: data.level || "", // on garde l'id du niveau
          });
        }

        // Récupérer les niveaux
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
    };
    fetchData();
  }, [router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : value,
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
        statut_paiement: form.statut_paiement,
        id_ecole: form.id_ecole || null,
        level: userData?.role === "eleve" ? form.level || null : null, // on sauvegarde l'id
      });

      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
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

  // retrouver le nom du niveau actuel (si défini)
  const selectedLevel = levels.find((lvl) => lvl.id === form.level);

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Configuration du profil
      </h1>

      {error && <p className="text-red-500 mb-4">{error}</p>}
      {success && (
        <p className="text-green-600 mb-4">Profil mis à jour avec succès !</p>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded shadow-md space-y-6 max-w-2xl"
      >
        {/* Nom et prénom */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 font-medium mb-1">Prénom</label>
            <input
              type="text"
              name="prenom"
              value={form.prenom}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded focus:outline-none focus:ring focus:ring-blue-300"
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
              className="w-full border px-3 py-2 rounded focus:outline-none focus:ring focus:ring-blue-300"
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
            className="w-full border px-3 py-2 rounded focus:outline-none focus:ring focus:ring-blue-300"
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
              className="w-full border px-3 py-2 rounded focus:outline-none focus:ring focus:ring-blue-300"
              required
            >
              <option value="">-- Choisir un niveau --</option>
              {levels.map((lvl) => (
                <option key={lvl.id} value={lvl.id}>
                  {lvl.name}
                </option>
              ))}
            </select>

            {/* affichage du niveau actuel */}
            {selectedLevel && (
              <p className="text-sm text-gray-500 mt-1">
                Niveau actuel : {selectedLevel.name}
              </p>
            )}
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
              className="w-full border px-3 py-2 rounded focus:outline-none focus:ring focus:ring-blue-300"
            />
          </div>
        )}

        {/* Statut paiement */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="statut_paiement"
            checked={form.statut_paiement}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label className="text-gray-700">Paiement effectué</label>
        </div>

        {/* Bouton */}
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
    </div>
  );
}
