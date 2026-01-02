"use client";
import { useState, useEffect } from "react";
import { db } from "@/firebase";
import { collection, doc, setDoc, getDocs, serverTimestamp } from "firebase/firestore";
import { Save, RefreshCw, Plus, AlertCircle, CheckCircle } from "lucide-react";

interface PlanConfig {
    name: string;
    exo_assistant: number;
    video_assistant: number;
    image_upload: number;
    version: number;
}

const DEFAULT_PLANS: Record<string, PlanConfig> = {
    gratuit: {
        name: "Plan Gratuit",
        exo_assistant: 5,
        video_assistant: 10,
        image_upload: 0,
        version: 1,
    },
    eleve: {
        name: "Plan Élève",
        exo_assistant: 150,
        video_assistant: 75,
        image_upload: 20,
        version: 1,
    },
    famille: {
        name: "Plan Famille",
        exo_assistant: 200,
        video_assistant: 100,
        image_upload: 30,
        version: 1,
    },
};

export default function QuotaLimit() {
    const [plans, setPlans] = useState<Record<string, PlanConfig>>(DEFAULT_PLANS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        checkIfInitialized();
    }, []);

    const checkIfInitialized = async () => {
        try {
            const planConfigsRef = collection(db, "plan_configs");
            const snapshot = await getDocs(planConfigsRef);
            setInitialized(!snapshot.empty);

            if (!snapshot.empty) {
                const loadedPlans: Record<string, PlanConfig> = {};
                snapshot.forEach((doc) => {
                    loadedPlans[doc.id] = doc.data() as PlanConfig;
                });
                setPlans(loadedPlans);
            }
        } catch (error) {
            console.error("Erreur lors de la vérification:", error);
        } finally {
            setLoading(false);
        }
    };

    const initializePlans = async () => {
        setSaving(true);
        setMessage(null);

        try {
            for (const [planId, planData] of Object.entries(DEFAULT_PLANS)) {
                await setDoc(doc(db, "plan_configs", planId), {
                    ...planData,
                    updated_at: serverTimestamp(),
                });
            }

            setMessage({ type: "success", text: "✅ Plans créés avec succès !" });
            setInitialized(true);
            await checkIfInitialized();
        } catch (error) {
            console.error("Erreur lors de l'initialisation:", error);
            setMessage({ type: "error", text: "❌ Erreur lors de la création des plans" });
        } finally {
            setSaving(false);
        }
    };

    const savePlan = async (planId: string) => {
        setSaving(true);
        setMessage(null);

        try {
            const planData = plans[planId];
            await setDoc(doc(db, "plan_configs", planId), {
                ...planData,
                updated_at: serverTimestamp(),
            });

            setMessage({ type: "success", text: `✅ Plan "${planData.name}" sauvegardé !` });
        } catch (error) {
            console.error("Erreur lors de la sauvegarde:", error);
            setMessage({ type: "error", text: "❌ Erreur lors de la sauvegarde" });
        } finally {
            setSaving(false);
        }
    };

    const updatePlanField = (planId: string, field: keyof PlanConfig, value: string | number) => {
        setPlans((prev) => ({
            ...prev,
            [planId]: {
                ...prev[planId],
                [field]: value,
            },
        }));
    };

    const incrementVersion = (planId: string) => {
        setPlans((prev) => ({
            ...prev,
            [planId]: {
                ...prev[planId],
                version: prev[planId].version + 1,
            },
        }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Gestion des Quotas IA</h1>
                <p className="text-gray-600">
                    Configurez les limites quotidiennes pour chaque plan d'abonnement
                </p>
            </div>

            {/* Message de retour */}
            {message && (
                <div
                    className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${message.type === "success"
                        ? "bg-green-50 text-green-800 border border-green-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                        }`}
                >
                    {message.type === "success" ? (
                        <CheckCircle size={20} />
                    ) : (
                        <AlertCircle size={20} />
                    )}
                    <span>{message.text}</span>
                </div>
            )}

            {/* Bouton d'initialisation */}
            {!initialized && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="text-blue-600 mt-1" size={24} />
                        <div className="flex-1">
                            <h3 className="font-semibold text-blue-900 mb-2">
                                Initialisation requise
                            </h3>
                            <p className="text-blue-800 mb-4">
                                La collection "plan_configs" n'existe pas encore. Cliquez sur le bouton
                                ci-dessous pour créer automatiquement les 3 plans avec leurs valeurs par
                                défaut.
                            </p>
                            <button
                                onClick={initializePlans}
                                disabled={saving}
                                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
                            >
                                <Plus size={18} />
                                Créer les plans automatiquement
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Formulaires pour chaque plan */}
            <div className="grid md:grid-cols-3 gap-6">
                {Object.entries(plans).map(([planId, planData]) => (
                    <div key={planId} className="bg-white rounded-lg shadow-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-800">{planData.name}</h2>
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                v{planData.version}
                            </span>
                        </div>

                        <div className="space-y-4">
                            {/* Nom du plan */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nom du plan
                                </label>
                                <input
                                    type="text"
                                    value={planData.name}
                                    onChange={(e) =>
                                        updatePlanField(planId, "name", e.target.value)
                                    }
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
                                />
                            </div>

                            {/* Assistant Exercices */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    📚 Assistant Exercices
                                </label>
                                <input
                                    type="number"
                                    value={planData.exo_assistant}
                                    onChange={(e) =>
                                        updatePlanField(
                                            planId,
                                            "exo_assistant",
                                            parseInt(e.target.value) || 0
                                        )
                                    }
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
                                    min="0"
                                />
                                <p className="text-xs text-gray-500 mt-1">Questions/jour</p>
                            </div>

                            {/* Assistant Vidéo */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    🎥 Assistant Vidéo
                                </label>
                                <input
                                    type="number"
                                    value={planData.video_assistant}
                                    onChange={(e) =>
                                        updatePlanField(
                                            planId,
                                            "video_assistant",
                                            parseInt(e.target.value) || 0
                                        )
                                    }
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
                                    min="0"
                                />
                                <p className="text-xs text-gray-500 mt-1">Questions/jour</p>
                            </div>

                            {/* Upload Image */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    📸 Upload Image
                                </label>
                                <input
                                    type="number"
                                    value={planData.image_upload}
                                    onChange={(e) =>
                                        updatePlanField(
                                            planId,
                                            "image_upload",
                                            parseInt(e.target.value) || 0
                                        )
                                    }
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
                                    min="0"
                                />
                                <p className="text-xs text-gray-500 mt-1">Images/jour</p>
                            </div>

                            {/* Boutons d'action */}
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={() => savePlan(planId)}
                                    disabled={saving}
                                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <Save size={16} />
                                    Sauvegarder
                                </button>
                                <button
                                    onClick={() => incrementVersion(planId)}
                                    disabled={saving}
                                    className="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
                                    title="Incrémenter la version"
                                >
                                    <RefreshCw size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Note informative */}
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                    <AlertCircle className="text-yellow-600 mt-0.5" size={18} />
                    <div className="text-sm text-yellow-800">
                        <p className="font-semibold mb-1">⚠️ Important</p>
                        <ul className="space-y-1 ml-4 list-disc">
                            <li>
                                Les modifications sont appliquées <strong>immédiatement</strong> pour
                                tous les utilisateurs
                            </li>
                            <li>
                                Incrémentez la version après chaque modification importante pour garder
                                une trace
                            </li>
                            <li>Les quotas se réinitialisent automatiquement chaque jour à minuit UTC</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}