"use client";

import { useState, useEffect } from "react";
import { db } from "@/firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";
import ExoForm from "@/components/admin/exo/ExoForm";

interface Exo {
  id: string;
  title: string;
  description: string;
  level_id: string;
  subject_id: string;
  course_id: string;
  statement_text: string;
  solution_text: string;
  order: number;
  tags: string[];
}

export default function ExoPage() {
  const [exos, setExos] = useState<Exo[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger exercices existants
  const fetchExos = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, "exercises"));
    setExos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Exo)));
    setLoading(false);
  };

  useEffect(() => {
    fetchExos();
  }, []);

  // Ajouter un exercice
  const handleAddExo = async (data: any) => {
    await addDoc(collection(db, "exercises"), data);
    await fetchExos(); // recharger la liste
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

      {/* Liste d’exos */}
      <div className="bg-white shadow-lg rounded-2xl p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-green-600 mb-4 flex items-center gap-2">
          📂 Exercices existants
        </h2>

        {loading ? (
          <p className="text-gray-500 italic">Chargement...</p>
        ) : exos.length === 0 ? (
          <p className="text-gray-500 italic">Aucun exercice trouvé.</p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exos.map((exo) => (
              <li
                key={exo.id}
                className="bg-gray-50 hover:bg-gray-100 transition rounded-2xl shadow p-4 flex flex-col justify-between border border-gray-100"
              >
                <div>
                  <p className="font-bold text-lg text-gray-800">{exo.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{exo.description}</p>
                </div>

                <div className="flex justify-between items-center mt-4">
                  <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                    Ordre : {exo.order}
                  </span>
                  {exo.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {exo.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
