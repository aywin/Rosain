"use client";
import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les utilisateurs Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, "users"));
        const data = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        setUsers(data);
      } catch (err) {
        console.error("Erreur lors de la récupération des utilisateurs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // Appel API pour supprimer un user
  const deleteUser = async (uid: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cet utilisateur ?")) return;

    try {
      const res = await fetch("/api/admin/deleteUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur inconnue");

      alert(data.message);
      // Mettre à jour l'état local (enlève l'utilisateur du tableau sans recharger la page)
      setUsers(prev => prev.filter(user => user.uid !== uid));
    } catch (err: any) {
      alert("Erreur: " + err.message);
    }
  };

  if (loading) return <p className="p-4">Chargement des utilisateurs...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Gestion des utilisateurs</h1>

      {users.length === 0 ? (
        <p>Aucun utilisateur trouvé.</p>
      ) : (
        <table className="w-full border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Nom</th>
              <th className="p-2 border">Prénom</th>
              <th className="p-2 border">Email</th>
              <th className="p-2 border">Rôle</th>
              <th className="p-2 border">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.uid}>
                <td className="p-2 border">{user.nom}</td>
                <td className="p-2 border">{user.prenom}</td>
                <td className="p-2 border">{user.email}</td>
                <td className="p-2 border">{user.role}</td>
                <td className="p-2 border text-center">
                  <button
                    onClick={() => deleteUser(user.uid)}
                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
