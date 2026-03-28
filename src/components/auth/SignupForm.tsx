"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  setDoc,
  doc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function SignupForm() {
  const router = useRouter();

  const initialPlan = "gratuit";
  const DEFAULT_LIMITS = {
    gratuit: { exo_assistant: 5, video_assistant: 10, image_upload: 0 },
    eleve: { exo_assistant: 150, video_assistant: 75, image_upload: 10 },
    famille: { exo_assistant: 200, video_assistant: 100, image_upload: 20 },
  };

  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    password: "",
    role: "eleve",
  });
  const [childrenEmails, setChildrenEmails] = useState<string[]>([]);
  const [error, setError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

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
      const userCred = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      const userId = userCred.user.uid;
      const emailLower = form.email.toLowerCase();

      // 1️⃣ Créer le document utilisateur
      await setDoc(doc(db, "users", userId), {
        nom: form.nom,
        prenom: form.prenom,
        email: emailLower,
        role: form.role,
        plan: initialPlan,
        statut_paiement: false,
        id_ecole: null,
        linkedStudents: [],
        pendingChildrenEmails: childrenEmails.map((e) => e.toLowerCase()),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 2️⃣ Créer le document quota
      await setDoc(doc(db, "quotas", userId), {
        user_id: userId,
        plan: initialPlan,
        daily_limits: DEFAULT_LIMITS[initialPlan],
        usage_today: { exo_assistant: 0, video_assistant: 0, image_upload: 0 },
        last_reset: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });

      // 3️⃣ Si l'élève s'inscrit, vérifier si un parent l'attend
      if (form.role === "eleve") {
        await createLinkRequestsIfNeeded(userId, emailLower);
      }

      router.push("/");
    } catch (err: any) {
      const messages: Record<string, string> = {
        "auth/email-already-in-use": "Cet email est déjà enregistré. Veuillez vous connecter.",
        "auth/invalid-email": "L'adresse email n'est pas valide.",
        "auth/weak-password": "Le mot de passe est trop faible.",
        "auth/operation-not-allowed": "L'inscription par email/mot de passe n'est pas activée.",
      };
      setError(messages[err.code] || err.message);
    }
  };

  return (
    <form
      className="max-w-md mx-auto mt-12 bg-white p-8 rounded-xl shadow"
      onSubmit={handleSignup}
    >
      <h2 className="text-2xl font-bold mb-4">Inscription</h2>

      <input type="text" name="nom" placeholder="Nom" required value={form.nom}
        onChange={handleChange} className="input mb-2 w-full" />
      <input type="text" name="prenom" placeholder="Prénom" required value={form.prenom}
        onChange={handleChange} className="input mb-2 w-full" />
      <input type="email" name="email" placeholder="Email" required value={form.email}
        onChange={handleChange} className="input mb-2 w-full" />
      <input type="password" name="password" placeholder="Mot de passe" required value={form.password}
        onChange={handleChange} className="input mb-4 w-full" />

      <label className="block mb-2 font-semibold">Je suis :</label>
      <select name="role" value={form.role} onChange={handleChange} className="input mb-4 w-full">
        <option value="eleve">Élève</option>
        <option value="parent">Parent</option>
        <option value="tuteur">Tuteur</option>
      </select>

      {(form.role === "parent" || form.role === "tuteur") && (
        <div className="mb-4">
          <label className="block font-semibold mb-2">Ajouter un enfant (optionnel)</label>
          {childrenEmails.map((email, index) => (
            <div key={index} className="flex items-center mb-2">
              <input type="email" placeholder="Email de l'enfant" value={email}
                onChange={(e) => handleChildEmailChange(index, e.target.value)}
                className="input w-full" />
              <button type="button" onClick={() => {
                const newEmails = [...childrenEmails];
                newEmails.splice(index, 1);
                setChildrenEmails(newEmails);
              }} className="ml-2 text-red-600 font-bold">❌</button>
            </div>
          ))}
          <button type="button" onClick={addChildEmail} className="text-teal-700 underline">
            + Ajouter un autre enfant
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded bg-red-100 text-red-700 border border-red-300">
          ⚠️ {error}
        </div>
      )}

      <button type="submit"
        className="bg-teal-700 text-white px-4 py-2 rounded w-full hover:bg-teal-800 transition">
        S'inscrire
      </button>

      <div className="text-center mt-2">
        Déjà un compte ?{" "}
        <span className="text-teal-700 underline cursor-pointer"
          onClick={() => router.push("/login")}>
          Se connecter
        </span>
      </div>
    </form>
  );
}

// ─── Vérifie si un parent attend cet email et crée un linkRequest ────────────
async function createLinkRequestsIfNeeded(childId: string, childEmail: string) {
  try {
    // Chercher tous les parents qui ont cet email en pending
    const q = query(
      collection(db, "users"),
      where("pendingChildrenEmails", "array-contains", childEmail)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    // Créer un linkRequest pour chaque parent trouvé
    await Promise.all(
      snap.docs.map((parentDoc) =>
        addDoc(collection(db, "linkRequests"), {
          parentId: parentDoc.id,
          childId,
          childEmail,
          childName: "", // sera rempli côté parent depuis le doc user
          status: "pending",
          createdAt: serverTimestamp(),
        })
      )
    );
  } catch (err) {
    console.error("Erreur createLinkRequestsIfNeeded:", err);
  }
}