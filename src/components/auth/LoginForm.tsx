"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function LoginForm() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      console.log("Tentative de connexion avec :", form.email, form.password);
      const userCred = await signInWithEmailAndPassword(auth, form.email, form.password);
      console.log("✅ Connecté :", userCred.user);

      router.push("/");
    } catch (err: any) {
      console.error("❌ Erreur login :", err.code, err.message);
      setError("Email ou mot de passe incorrect.");
    }
  };

  return (
    <form className="max-w-md mx-auto mt-20 bg-white p-8 rounded-xl shadow" onSubmit={handleLogin}>
      <h2 className="text-2xl font-bold mb-4">Connexion</h2>
      <input type="email" name="email" placeholder="Email" required value={form.email} onChange={handleChange} className="input mb-2 w-full" />
      <input type="password" name="password" placeholder="Mot de passe" required value={form.password} onChange={handleChange} className="input mb-4 w-full" />
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <button type="submit" className="bg-blue-700 text-white px-4 py-2 rounded w-full">Se connecter</button>
      <div className="text-center mt-2">
        Pas encore de compte ?{" "}
        <span className="text-blue-700 underline cursor-pointer" onClick={() => router.push("/signup")}>S’inscrire</span>
      </div>
    </form>
  );
}
