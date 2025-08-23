'use client';

import { useEffect, useState } from 'react';
import { db } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExos = async () => {
      const snap = await getDocs(collection(db, 'exercises'));
      setExercises(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    fetchExos();
  }, []);

  if (loading) return <div className="p-4">Chargement...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Liste des Exercices</h1>
      <div className="space-y-4">
        {exercises.map(exo => (
          <div key={exo.id} className="border p-4 rounded-lg shadow">
            <h2 className="font-semibold text-lg">{exo.title}</h2>
            <p className="text-gray-700">{exo.statement}</p>
            {exo.solution && (
              <details className="mt-2">
                <summary className="cursor-pointer text-blue-600">Voir solution</summary>
                <p className="mt-2">{exo.solution}</p>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
