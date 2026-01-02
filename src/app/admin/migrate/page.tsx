"use client";
import { useState } from "react";
import { db } from "@/firebase";
import { collection, getDocs, doc, writeBatch } from "firebase/firestore";

export default function MigratePage() {
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(false);

    const migrate = async () => {
        if (!confirm("Migrer les exercices vers course_ids ?")) return;

        setLoading(true);
        setStatus("Migration en cours...");

        try {
            const snapshot = await getDocs(collection(db, "exercises"));
            const batch = writeBatch(db);

            let migratedCount = 0;
            let skippedCount = 0;

            snapshot.docs.forEach((docSnap) => {
                const data = docSnap.data();

                if (data.course_ids && Array.isArray(data.course_ids)) {
                    skippedCount++;
                    return;
                }

                if (data.course_id) {
                    batch.update(doc(db, "exercises", docSnap.id), {
                        course_ids: [data.course_id]
                    });
                    migratedCount++;
                }
            });

            await batch.commit();

            setStatus(`✅ Succès!\nMigrés: ${migratedCount}\nIgnorés: ${skippedCount}\nTotal: ${snapshot.size}`);
        } catch (error) {
            setStatus(`❌ Erreur: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Migration Multi-Cours</h1>

            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
                <p className="text-sm">
                    ⚠️ Convertit course_id → course_ids (array)<br />
                    À exécuter une seule fois.
                </p>
            </div>

            <button
                onClick={migrate}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded font-semibold"
            >
                {loading ? "Migration..." : "Migrer"}
            </button>

            {status && (
                <pre className="mt-4 p-4 bg-gray-100 rounded text-sm">{status}</pre>
            )}

            <p className="mt-4 text-sm text-gray-600">
                💡 Supprimez cette page après migration
            </p>
        </div>
    );
}