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
      const userCred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const userId = userCred.user.uid;
      await setDoc(doc(db, "users", userId), {
        nom: form.nom,
        prenom: form.prenom,
        email: form.email,
        role: "eleve",
        statut_paiement: false,
        id_ecole: null
      });
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <form className="max-w-md mx-auto mt-12 bg-white p-8 rounded-xl shadow" onSubmit={handleSignup}>
      <h2 className="text-2xl font-bold mb-4">Inscription</h2>
      <input type="text" name="nom" placeholder="Nom" required value={form.nom} onChange={handleChange} className="input mb-2 w-full" />
      <input type="text" name="prenom" placeholder="Prénom" required value={form.prenom} onChange={handleChange} className="input mb-2 w-full" />
      <input type="email" name="email" placeholder="Email" required value={form.email} onChange={handleChange} className="input mb-2 w-full" />
      <input type="password" name="password" placeholder="Mot de passe" required value={form.password} onChange={handleChange} className="input mb-4 w-full" />
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <button type="submit" className="bg-blue-700 text-white px-4 py-2 rounded w-full">S'inscrire</button>
      <div className="text-center mt-2">
        Déjà un compte ?{" "}
        <span className="text-blue-700 underline cursor-pointer" onClick={() => router.push("/login")}>Se connecter</span>
      </div>
    </form>
  );
}
