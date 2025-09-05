"use client";

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";

interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  statut_paiement: boolean;
  id_ecole: string | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const usersData: User[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as User[];
        setUsers(usersData);
      } catch (error) {
        console.error("Erreur récupération utilisateurs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (loading) return <p className="text-center mt-8">Chargement...</p>;

  return (
    <div className="max-w-3xl mx-auto mt-12 p-6 bg-white shadow rounded-xl">
      <h1 className="text-2xl font-bold mb-6">Liste des utilisateurs</h1>
      {users.length === 0 ? (
        <p>Aucun utilisateur trouvé.</p>
      ) : (
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2 text-left">Nom</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Prénom</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Email</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Rôle</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Paiement</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td className="border border-gray-300 px-4 py-2">{user.nom}</td>
                <td className="border border-gray-300 px-4 py-2">{user.prenom}</td>
                <td className="border border-gray-300 px-4 py-2">{user.email}</td>
                <td className="border border-gray-300 px-4 py-2">{user.role}</td>
                <td className="border border-gray-300 px-4 py-2">
                  {user.statut_paiement ? "✅" : "❌"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
