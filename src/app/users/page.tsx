"use client";
import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

const ROLES = ["student", "tuteur", "parent", "superadmin"];

const ROLE_LABELS: Record<string, string> = {
  student: "Élève",
  tuteur: "Tuteur / Prof",
  parent: "Parent",
  superadmin: "Super Admin",
};

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [savingRole, setSavingRole] = useState<string | null>(null);

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
      setUsers(prev => prev.filter(user => user.uid !== uid));
    } catch (err: any) {
      alert("Erreur: " + err.message);
    }
  };

  const handleRoleChange = async (uid: string, newRole: string) => {
    setSavingRole(uid);
    try {
      await updateDoc(doc(db, "users", uid), { role: newRole });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
    } catch (err: any) {
      alert("Erreur: " + err.message);
    } finally {
      setSavingRole(null);
      setEditingRole(null);
    }
  };

  if (loading) return <p className="p-4">Chargement des utilisateurs...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Gestion des utilisateurs</h1>

      {users.length === 0 ? (
        <p>Aucun utilisateur trouvé.</p>
      ) : (
        <table className="w-full border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border text-left">Nom</th>
              <th className="p-2 border text-left">Prénom</th>
              <th className="p-2 border text-left">Email</th>
              <th className="p-2 border text-left">Rôle</th>
              <th className="p-2 border text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.uid} className="hover:bg-gray-50">
                <td className="p-2 border">{user.nom}</td>
                <td className="p-2 border">{user.prenom}</td>
                <td className="p-2 border text-gray-500">{user.email}</td>
                <td className="p-2 border">
                  {editingRole === user.uid ? (
                    <select
                      title="Changer le rôle"
                      defaultValue={user.role}
                      onChange={(e) => handleRoleChange(user.uid, e.target.value)}
                      disabled={savingRole === user.uid}
                      autoFocus
                      onBlur={() => setEditingRole(null)}
                      className="border border-teal-400 rounded px-2 py-1 text-sm outline-none"
                    >
                      {ROLES.map(r => (
                        <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
                      ))}
                    </select>
                  ) : (
                    <button
                      onClick={() => setEditingRole(user.uid)}
                      className="flex items-center gap-1 group"
                      title="Cliquer pour modifier"
                    >
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.role === "tuteur" ? "bg-teal-100 text-teal-800" :
                        user.role === "superadmin" ? "bg-purple-100 text-purple-800" :
                        user.role === "parent" ? "bg-blue-100 text-blue-800" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {ROLE_LABELS[user.role] || user.role || "—"}
                      </span>
                      <span className="text-gray-300 group-hover:text-gray-500 text-xs">✏️</span>
                    </button>
                  )}
                </td>
                <td className="p-2 border text-center">
                  <button
                    onClick={() => deleteUser(user.uid)}
                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-xs"
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
