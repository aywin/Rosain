"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";

export default function LoginForm() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resetMode, setResetMode] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const userCred = await signInWithEmailAndPassword(auth, form.email, form.password);
      console.log("✅ Connecté :", userCred.user);
      router.push("/");
    } catch (err: any) {
      console.error("❌ Erreur login :", err.code, err.message);
      setError("Email ou mot de passe incorrect.");
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setMessage("");

    if (!form.email) {
      setResetMode(true); // on passe en mode reset (cache le champ mot de passe)
      setError("⚠️ Veuillez entrer votre email pour réinitialiser le mot de passe.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, form.email);
      setMessage("📧 Un email de réinitialisation a été envoyé à " + form.email);
      setError("");
      setResetMode(true); // on cache le champ mot de passe
    } catch (err: any) {
      console.error("❌ Erreur reset password :", err.code, err.message);
      setError("Impossible d’envoyer l’email de réinitialisation.");
    }
  };

  return (
    <form
      className="max-w-md mx-auto mt-20 bg-white p-8 rounded-xl shadow"
      onSubmit={handleLogin}
    >
      <h2 className="text-2xl font-bold mb-4">Connexion</h2>

      {/* Champ Email */}
      <input
        type="email"
        name="email"
        placeholder="Email"
        required
        value={form.email}
        onChange={handleChange}
        className="input mb-2 w-full"
      />

      {/* Champ Password caché si resetMode */}
      {!resetMode && (
        <input
          type="password"
          name="password"
          placeholder="Mot de passe"
          required
          value={form.password}
          onChange={handleChange}
          className="input mb-2 w-full"
        />
      )}

      {/* Messages */}
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {message && <div className="text-green-600 mb-2">{message}</div>}

      {/* Boutons */}
      {!resetMode ? (
        <button
          type="submit"
          className="bg-blue-700 text-white px-4 py-2 rounded w-full"
        >
          Se connecter
        </button>
      ) : (
        <button
          type="button"
          className="bg-blue-700 text-white px-4 py-2 rounded w-full"
          onClick={handleForgotPassword}
        >
          Envoyer le lien de réinitialisation
        </button>
      )}

      {/* Liens */}
      <div className="text-right mt-2">
        <span
          className="text-sm text-blue-700 underline cursor-pointer"
          onClick={handleForgotPassword}
        >
          Mot de passe oublié ?
        </span>
      </div>

      <div className="text-center mt-4">
        Pas encore de compte ?{" "}
        <span
          className="text-blue-700 underline cursor-pointer"
          onClick={() => router.push("/signup")}
        >
          S’inscrire
        </span>
      </div>
    </form>
  );
}
