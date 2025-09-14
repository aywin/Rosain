"use client";

import ExoForm from "@/components/admin/exo/ExoForm";
import ExoList from "@/components/admin/exo/ExoList";
import { db } from "@/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useState } from "react";

export default function ExoPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Trigger pour recharger ExoList après ajout
  const handleAddExo = async (data: any) => {
    await addDoc(collection(db, "exercises"), data);
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 bg-blue-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        📘 Gestion des Exercices
      </h1>

      {/* Formulaire */}
      <div className="bg-white shadow-lg rounded-2xl p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-blue-600 mb-4 flex items-center gap-2">
          ➕ Ajouter un exercice
        </h2>
        <ExoForm onSubmit={handleAddExo} />
      </div>

      {/* Liste */}
      <div className="bg-white shadow-lg rounded-2xl p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-green-600 mb-4 flex items-center gap-2">
          📂 Exercices existants
        </h2>
        <ExoList refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
}
