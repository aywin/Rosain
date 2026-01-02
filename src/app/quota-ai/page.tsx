"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/firebase";
import { buildApiUrl, apiConfig } from "@/config/api";
import { BookOpen, Video, AlertCircle, CheckCircle, TrendingUp, RefreshCw, ArrowLeft } from "lucide-react";

interface QuotaData {
    used: number;
    limit: number;
    remaining: number;
    percentage: number;
    warning_level: string;
}

interface QuotasResponse {
    video_assistant: QuotaData;
    exo_assistant: QuotaData;
    plan: string;
    user_id: string;
    timestamp: string;
}

export default function QuotaAIPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [authChecking, setAuthChecking] = useState(true); // ✅ Nouveau état
    const [quotas, setQuotas] = useState<QuotasResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchQuotas = async (userId: string) => {
        setLoading(true);
        setError(null);

        try {
            const apiUrl = buildApiUrl(apiConfig.endpoints.quota, { user_id: userId });
            const res = await fetch(apiUrl);

            if (!res.ok) {
                throw new Error(`Erreur ${res.status}`);
            }

            const data = await res.json();
            setQuotas(data);
        } catch (err) {
            console.error("Erreur lors de la récupération des quotas:", err);
            setError("Impossible de charger les informations de quota");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // ✅ Attendre que Firebase soit initialisé
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setAuthChecking(false); // Firebase a fini de charger

            if (!user) {
                router.push("/login");
            } else {
                fetchQuotas(user.uid);
            }
        });

        return () => unsubscribe();
    }, [router]);

    const getQuotaColor = (warningLevel: string) => {
        switch (warningLevel) {
            case "critical":
            case "blocked":
                return "text-red-600";
            case "warning":
                return "text-orange-600";
            default:
                return "text-green-600";
        }
    };

    const getQuotaBarColor = (warningLevel: string) => {
        switch (warningLevel) {
            case "critical":
            case "blocked":
                return "bg-red-600";
            case "warning":
                return "bg-orange-500";
            default:
                return "bg-green-600";
        }
    };

    const getQuotaIcon = (warningLevel: string) => {
        switch (warningLevel) {
            case "critical":
            case "blocked":
                return <AlertCircle className="text-red-600" size={24} />;
            case "warning":
                return <AlertCircle className="text-orange-600" size={24} />;
            default:
                return <CheckCircle className="text-green-600" size={24} />;
        }
    };

    const getQuotaMessage = (warningLevel: string, remaining: number) => {
        switch (warningLevel) {
            case "blocked":
                return "🚫 Quota dépassé ! Revenez demain ou passez à un plan supérieur";
            case "critical":
                return `⚠️ Attention ! Il ne vous reste que ${remaining} question${remaining > 1 ? 's' : ''}`;
            case "warning":
                return `🔔 Vous approchez de votre limite (${remaining} restantes)`;
            default:
                return `✅ Tout va bien ! ${remaining} questions disponibles`;
        }
    };

    const getPlanBadgeColor = (plan: string) => {
        switch (plan) {
            case "famille":
                return "bg-purple-100 text-purple-800 border-purple-300";
            case "eleve":
                return "bg-blue-100 text-blue-800 border-blue-300";
            default:
                return "bg-gray-100 text-gray-800 border-gray-300";
        }
    };

    // ✅ Afficher un loader pendant que Firebase charge
    if (authChecking || loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Chargement des quotas...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
                    <AlertCircle className="text-red-600 mx-auto mb-4" size={48} />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Erreur</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={() => auth.currentUser && fetchQuotas(auth.currentUser.uid)}
                        className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2 mx-auto"
                    >
                        <RefreshCw size={18} />
                        Réessayer
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <div className="flex items-center gap-4 mb-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                            title="Retour"
                        >
                            <ArrowLeft size={20} className="text-gray-600" />
                        </button>
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                                <TrendingUp className="text-green-600" size={32} />
                                Vos Quotas IA
                            </h1>
                        </div>
                        <button
                            onClick={() => auth.currentUser && fetchQuotas(auth.currentUser.uid)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                            title="Actualiser"
                        >
                            <RefreshCw size={20} className="text-gray-600" />
                        </button>
                    </div>
                    <p className="text-gray-600 ml-14">
                        Suivez votre utilisation quotidienne des assistants IA
                    </p>
                    {quotas?.plan && (
                        <div className={`mt-4 ml-14 inline-block px-4 py-2 rounded-full text-sm font-semibold border ${getPlanBadgeColor(quotas.plan)}`}>
                            📦 Plan : {quotas.plan.charAt(0).toUpperCase() + quotas.plan.slice(1)}
                        </div>
                    )}
                </div>

                {/* Quotas Cards */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Assistant Vidéo */}
                    {quotas?.video_assistant && (
                        <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-blue-100 rounded-lg">
                                    <Video className="text-blue-600" size={28} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">
                                        Assistant Vidéo
                                    </h2>
                                    <p className="text-sm text-gray-500">
                                        Questions sur les vidéos
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    {getQuotaIcon(quotas.video_assistant.warning_level)}
                                    <span className={`text-2xl font-bold ${getQuotaColor(quotas.video_assistant.warning_level)}`}>
                                        {quotas.video_assistant.used} / {quotas.video_assistant.limit}
                                    </span>
                                </div>

                                <div>
                                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                                        <span>Utilisation</span>
                                        <span>{quotas.video_assistant.percentage.toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                        <div
                                            className={`h-3 rounded-full transition-all ${getQuotaBarColor(quotas.video_assistant.warning_level)}`}
                                            style={{ width: `${Math.min(quotas.video_assistant.percentage, 100)}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-sm text-gray-700">
                                        {getQuotaMessage(
                                            quotas.video_assistant.warning_level,
                                            quotas.video_assistant.remaining
                                        )}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                    <div>
                                        <p className="text-xs text-gray-500">Utilisées</p>
                                        <p className="text-lg font-bold text-gray-800">
                                            {quotas.video_assistant.used}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Restantes</p>
                                        <p className="text-lg font-bold text-green-600">
                                            {quotas.video_assistant.remaining}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Assistant Exercices */}
                    {quotas?.exo_assistant && (
                        <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-green-100 rounded-lg">
                                    <BookOpen className="text-green-600" size={28} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">
                                        Assistant Exercices
                                    </h2>
                                    <p className="text-sm text-gray-500">
                                        Aide sur les exercices
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    {getQuotaIcon(quotas.exo_assistant.warning_level)}
                                    <span className={`text-2xl font-bold ${getQuotaColor(quotas.exo_assistant.warning_level)}`}>
                                        {quotas.exo_assistant.used} / {quotas.exo_assistant.limit}
                                    </span>
                                </div>

                                <div>
                                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                                        <span>Utilisation</span>
                                        <span>{quotas.exo_assistant.percentage.toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                        <div
                                            className={`h-3 rounded-full transition-all ${getQuotaBarColor(quotas.exo_assistant.warning_level)}`}
                                            style={{ width: `${Math.min(quotas.exo_assistant.percentage, 100)}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-sm text-gray-700">
                                        {getQuotaMessage(
                                            quotas.exo_assistant.warning_level,
                                            quotas.exo_assistant.remaining
                                        )}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                    <div>
                                        <p className="text-xs text-gray-500">Utilisées</p>
                                        <p className="text-lg font-bold text-gray-800">
                                            {quotas.exo_assistant.used}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Restantes</p>
                                        <p className="text-lg font-bold text-green-600">
                                            {quotas.exo_assistant.remaining}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Info Box */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                        <AlertCircle size={20} />
                        Informations importantes
                    </h3>
                    <ul className="space-y-2 text-sm text-blue-800">
                        <li>• Les quotas se réinitialisent automatiquement chaque jour à minuit (UTC)</li>
                        <li>• Chaque question posée consomme 1 crédit du quota correspondant</li>
                        <li>• Les limites dépendent de votre plan d'abonnement</li>
                    </ul>
                </div>

                {/* CTA pour upgrade */}
                {(quotas?.video_assistant.warning_level === "critical" ||
                    quotas?.video_assistant.warning_level === "blocked" ||
                    quotas?.exo_assistant.warning_level === "critical" ||
                    quotas?.exo_assistant.warning_level === "blocked") &&
                    quotas?.plan === "gratuit" && (
                        <div className="mt-6 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg shadow-lg p-6">
                            <h3 className="text-xl font-bold mb-2">
                                🚀 Besoin de plus de questions ?
                            </h3>
                            <p className="mb-4 opacity-90">
                                Passez à un plan supérieur pour augmenter vos limites quotidiennes !
                            </p>
                            <button
                                onClick={() => router.push("/pricing")}
                                className="bg-white text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
                            >
                                Voir les plans
                            </button>
                        </div>
                    )}

                {quotas?.timestamp && (
                    <p className="text-center text-sm text-gray-500 mt-6">
                        Dernière mise à jour : {new Date(quotas.timestamp).toLocaleString("fr-FR")}
                    </p>
                )}
            </div>
        </div>
    );
}