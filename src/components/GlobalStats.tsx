"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import { Users, BookOpen, Layers } from "lucide-react";

export default function StatsSection() {
  const [userCount, setUserCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        // ✅ On ajoute 1000 fictifs
        setUserCount(usersSnapshot.size + 1000);
      } catch (error) {
        console.error("Erreur lors de la récupération des utilisateurs:", error);
      }
    };
    fetchUsers();
  }, []);

  
  const stats = [
    {
      title: "Utilisateurs actifs",
      value: userCount !== null ? userCount : "...",
      icon: <Users className="w-10 h-10 text-blue-600" />,
      description: "Apprenants engagés chaque jour",
    },
    

  ];

  return (
    <section className="py-16 bg-gradient-to-r from-blue-50 to-indigo-50">
      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10 px-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white shadow-lg rounded-2xl p-8 text-center hover:shadow-2xl transition"
          >
            <div className="flex justify-center mb-4">
              <div className="bg-gray-100 rounded-full p-4">{stat.icon}</div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {stat.title}
            </h3>
            <p className="text-4xl font-extrabold text-blue-700 mb-3">
              {stat.value}
            </p>
            <p className="text-sm text-gray-600">{stat.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
