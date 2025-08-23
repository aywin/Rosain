'use client';

import { useEffect, useState } from 'react';
import { db } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import ExoForm from '@/components/admin/ExoForm';

export default function AdminExoPage() {
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [levels, setLevels] = useState<{ id: string; name: string }[]>([]);
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const subjSnap = await getDocs(collection(db, 'subjects'));
      const lvlSnap = await getDocs(collection(db, 'levels'));
      const courseSnap = await getDocs(collection(db, 'courses'));

      setSubjects(subjSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any);
      setLevels(lvlSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any);
      setCourses(courseSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) return <div className="p-4">Chargement des données...</div>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Administration : Ajouter un Exercice</h1>
      <ExoForm
        subjects={subjects}
        levels={levels}
        courses={courses}
        onAdded={() => alert('Exercice ajouté avec succès !')}
      />
    </div>
  );
}
