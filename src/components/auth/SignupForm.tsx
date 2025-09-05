"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";

export default function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState({ nom: "", prenom: "", email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      console.log("Tentative d'inscription avec :", form.email, form.password);
      const userCred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      console.log("✅ Utilisateur créé :", userCred.user);

      const userId = userCred.user.uid;
      await setDoc(doc(db, "users", userId), {
        nom: form.nom,
        prenom: form.prenom,
        email: form.email,
        role: "eleve",
        statut_paiement: false,
        id_ecole: null
      });
      console.log("✅ Document Firestore ajouté pour :", userId);

      router.push("/");
    } catch (err: any) {
      console.error("❌ Erreur inscription :", err.code, err.message);

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
    <form className="max-w-md mx-auto mt-12 bg-white p-8 rounded-xl shadow" onSubmit={handleSignup}>
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
