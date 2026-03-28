"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { resolvePendingChildren } from "@/helpers/parentFetchers";

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
      const userId = userCred.user.uid;

      // Résoudre les pendingChildrenEmails si parent/tuteur
      const userSnap = await getDoc(doc(db, "users", userId));
      if (userSnap.exists()) {
        const role = userSnap.data().role;
        if (role === "parent" || role === "tuteur") {
          // Fire-and-forget — ne bloque pas la navigation
          resolvePendingChildren(userId).catch(console.error);
          router.push("/parent");
          return;
        }
      }

      router.push("/");
    } catch (err: any) {
      const errorMessages: Record<string, string> = {
        "auth/invalid-email": "Adresse email invalide.",
        "auth/user-disabled": "Ce compte a été désactivé.",
        "auth/user-not-found": "Aucun compte associé à cet email.",
        "auth/wrong-password": "Mot de passe incorrect.",
        "auth/invalid-credential": "Email ou mot de passe incorrect.",
      };
      setError(errorMessages[err.code] || "Une erreur est survenue. Réessayez plus tard.");
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setMessage("");
    if (!form.email) {
      setResetMode(true);
      setError("⚠️ Veuillez entrer votre email pour réinitialiser le mot de passe.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, form.email);
      setMessage("📧 Un email de réinitialisation a été envoyé à " + form.email);
      setResetMode(true);
    } catch {
      setError("Impossible d'envoyer l'email de réinitialisation.");
    }
  };

  return (
    <form
      className="max-w-md mx-auto mt-20 bg-white p-8 rounded-xl shadow"
      onSubmit={handleLogin}
    >
      <h2 className="text-2xl font-bold mb-4">Connexion</h2>

      <input
        type="email"
        name="email"
        placeholder="Email"
        required
        value={form.email}
        onChange={handleChange}
        className="input mb-2 w-full"
      />

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

      {error && <div className="text-red-500 mb-2">{error}</div>}
      {message && <div className="text-green-600 mb-2">{message}</div>}

      {!resetMode ? (
        <button type="submit" className="bg-teal-700 text-white px-4 py-2 rounded w-full hover:bg-teal-800 transition">
          Se connecter
        </button>
      ) : (
        <button type="button" className="bg-teal-700 text-white px-4 py-2 rounded w-full hover:bg-teal-800 transition" onClick={handleForgotPassword}>
          Envoyer le lien de réinitialisation
        </button>
      )}

      <div className="text-right mt-2">
        <span className="text-sm text-teal-700 underline cursor-pointer" onClick={handleForgotPassword}>
          Mot de passe oublié ?
        </span>
      </div>

      <div className="text-center mt-4">
        Pas encore de compte ?{" "}
        <span className="text-teal-700 underline cursor-pointer" onClick={() => router.push("/signup")}>
          S'inscrire
        </span>
      </div>
    </form>
  );
}