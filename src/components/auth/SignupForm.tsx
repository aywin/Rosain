"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { PLAN_LIMITS, type Plan } from "@/type/quota";

export default function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    password: "",
    role: "eleve", // par défaut
  });
  const [childrenEmails, setChildrenEmails] = useState<string[]>([]);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const addChildEmail = () => setChildrenEmails([...childrenEmails, ""]);
  const handleChildEmailChange = (index: number, value: string) => {
    const newEmails = [...childrenEmails];
    newEmails[index] = value;
    setChildrenEmails(newEmails);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const userCred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const userId = userCred.user.uid;

      // Déterminer le plan initial (toujours gratuit à l'inscription)
      const initialPlan: Plan = "gratuit";

      // 1️⃣ Créer le document utilisateur
      await setDoc(doc(db, "users", userId), {
        nom: form.nom,
        prenom: form.prenom,
        email: form.email,
        role: form.role, // eleve, parent, tuteur
        plan: initialPlan,
        statut_paiement: false,
        id_ecole: null,
        linkedStudents: [], // pour parent/tuteur
        pendingChildrenEmails: childrenEmails, // emails ajoutés
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 2️⃣ Créer le document quota (🆕 NOUVEAU)
      await setDoc(doc(db, "quotas", userId), {
        user_id: userId,
        plan: initialPlan,
        daily_limits: PLAN_LIMITS[initialPlan],
        usage_today: {
          exo_assistant: 0,
          video_assistant: 0,
          image_upload: 0,
        },
        last_reset: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });

      console.log("✅ Utilisateur et quota créés avec succès");
      router.push("/");
    } catch (err: any) {
      console.error("❌ Erreur inscription :", err);
      let message = "Une erreur est survenue. Veuillez réessayer.";
      switch (err.code) {
        case "auth/email-already-in-use":
          message = "Cet email est déjà enregistré. Veuillez vous connecter.";
          break;
        case "auth/invalid-email":
          message = "L'adresse email n'est pas valide.";
          break;
        case "auth/weak-password":
          message = "Le mot de passe est trop faible. Choisissez-en un plus sécurisé.";
          break;
        case "auth/operation-not-allowed":
          message = "L'inscription par email/mot de passe n'est pas activée.";
          break;
        default:
          message = err.message;
      }
      setError(message);
    }
  };

  return (
    <form
      className="max-w-md mx-auto mt-12 bg-white p-8 rounded-xl shadow"
      onSubmit={handleSignup}
    >
      <h2 className="text-2xl font-bold mb-4">Inscription</h2>

      <input
        type="text"
        name="nom"
        placeholder="Nom"
        required
        value={form.nom}
        onChange={handleChange}
        className="input mb-2 w-full"
      />
      <input
        type="text"
        name="prenom"
        placeholder="Prénom"
        required
        value={form.prenom}
        onChange={handleChange}
        className="input mb-2 w-full"
      />
      <input
        type="email"
        name="email"
        placeholder="Email"
        required
        value={form.email}
        onChange={handleChange}
        className="input mb-2 w-full"
      />
      <input
        type="password"
        name="password"
        placeholder="Mot de passe"
        required
        value={form.password}
        onChange={handleChange}
        className="input mb-4 w-full"
      />

      {/* Sélecteur de rôle */}
      <label className="block mb-2 font-semibold">Je suis :</label>
      <select
        name="role"
        value={form.role}
        onChange={handleChange}
        className="input mb-4 w-full"
      >
        <option value="eleve">Élève</option>
        <option value="parent">Parent</option>
        <option value="tuteur">Tuteur</option>
      </select>

      {/* Bloc optionnel – uniquement pour parent/tuteur */}
      {(form.role === "parent" || form.role === "tuteur") && (
        <div className="mb-4">
          <label className="block font-semibold mb-2">Ajouter un enfant (optionnel)</label>
          {childrenEmails.map((email, index) => (
            <div key={index} className="flex items-center mb-2">
              <input
                type="email"
                placeholder="Email de l'enfant"
                value={email}
                onChange={(e) => handleChildEmailChange(index, e.target.value)}
                className="input w-full"
              />
              <button
                type="button"
                onClick={() => {
                  const newEmails = [...childrenEmails];
                  newEmails.splice(index, 1);
                  setChildrenEmails(newEmails);
                }}
                className="ml-2 text-red-600 font-bold"
              >
                ❌
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addChildEmail}
            className="text-blue-700 underline"
          >
            + Ajouter un autre enfant
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded bg-red-100 text-red-700 border border-red-300">
          ⚠️ {error}
        </div>
      )}

      <button
        type="submit"
        className="bg-blue-700 text-white px-4 py-2 rounded w-full hover:bg-blue-800 transition"
      >
        S'inscrire
      </button>

      <div className="text-center mt-2">
        Déjà un compte ?{" "}
        <span
          className="text-blue-700 underline cursor-pointer"
          onClick={() => router.push("/login")}
        >
          Se connecter
        </span>
      </div>
    </form>
  );
}