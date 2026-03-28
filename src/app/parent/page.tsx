"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
    resolvePendingChildren,
    getLinkedChildren,
    getChildFullData,
    getPendingLinkRequests,
    confirmLinkRequest,
    rejectLinkRequest,
    ChildFullData,
    LinkRequest,
} from "@/helpers/parentFetchers";
import {
    Users,
    BookOpen,
    Clock,
    Zap,
    TrendingUp,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    CheckCircle,
    Play,
    Loader2,
    UserPlus,
    X,
    Bell,
} from "lucide-react";
import { arrayUnion, updateDoc } from "firebase/firestore";

// ─── Composant carte enfant ───────────────────────────────────────────────────
function ChildCard({ data }: { data: ChildFullData }) {
    const [open, setOpen] = useState(false);
    const { info, courseProgress, videoSummary, quota } = data;

    const doneCourses = courseProgress.filter((c) => c.status === "done").length;
    const inProgressCourses = courseProgress.filter((c) => c.status === "in_progress").length;

    const lastActivityLabel = videoSummary.lastActivity
        ? new Intl.RelativeTimeFormat("fr", { numeric: "auto" }).format(
            Math.round(
                (videoSummary.lastActivity.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            ),
            "day"
        )
        : "Aucune activité";

    const exoPercent = quota
        ? Math.round((quota.exoAssistantUsed / quota.exoAssistantLimit) * 100)
        : 0;
    const videoPercent = quota
        ? Math.round((quota.videoAssistantUsed / quota.videoAssistantLimit) * 100)
        : 0;

    const videoProgressPercent =
        videoSummary.totalVideos > 0
            ? Math.round((videoSummary.completedVideos / videoSummary.totalVideos) * 100)
            : 0;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-200">
            {/* En-tête enfant */}
            <div
                className="flex items-center justify-between px-6 py-5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setOpen((o) => !o)}
            >
                <div className="flex items-center gap-4">
                    {/* Avatar initiales */}
                    <div className="w-11 h-11 rounded-full bg-teal-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {info.prenom?.[0]?.toUpperCase() || "?"}
                        {info.nom?.[0]?.toUpperCase() || ""}
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900">
                            {info.prenom} {info.nom}
                        </p>
                        <p className="text-xs text-gray-500">{info.email}</p>
                    </div>
                </div>

                {/* Stats résumé */}
                <div className="hidden sm:flex items-center gap-6 text-sm text-gray-600">
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-teal-600" />
                        <span>{lastActivityLabel}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-teal-600" />
                        <span>
                            <span className="font-semibold text-gray-800">{doneCourses}</span> cours terminés
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Play className="w-4 h-4 text-teal-600" />
                        <span>
                            <span className="font-semibold text-gray-800">{videoSummary.totalMinutesWatched}</span> min regardées
                        </span>
                    </div>
                </div>

                {open ? (
                    <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
            </div>

            {/* Détails dépliables */}
            {open && (
                <div className="border-t border-gray-100 px-6 py-5 grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {/* Progression vidéos */}
                    <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Play className="w-4 h-4 text-teal-700" />
                            <span className="text-sm font-semibold text-gray-700">Vidéos</span>
                        </div>
                        <div className="flex items-end gap-1 mb-2">
                            <span className="text-3xl font-bold text-gray-900">{videoProgressPercent}%</span>
                            <span className="text-xs text-gray-500 mb-1">de progression</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                            <div
                                className="h-full bg-teal-600 rounded-full transition-all duration-500"
                                style={{ width: `${videoProgressPercent}%` }}
                            />
                        </div>
                        <p className="text-xs text-gray-500">
                            {videoSummary.completedVideos}/{videoSummary.totalVideos} vidéos terminées
                        </p>
                        <p className="text-xs text-gray-500">{videoSummary.totalMinutesWatched} min regardées</p>
                    </div>

                    {/* Cours */}
                    <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <BookOpen className="w-4 h-4 text-teal-700" />
                            <span className="text-sm font-semibold text-gray-700">Cours</span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Terminés</span>
                                <span className="font-semibold text-green-600">{doneCourses}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">En cours</span>
                                <span className="font-semibold text-teal-600">{inProgressCourses}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Total suivi</span>
                                <span className="font-semibold text-gray-800">{courseProgress.length}</span>
                            </div>
                        </div>
                        {courseProgress.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                                <p className="text-xs text-gray-500">
                                    Dernière activité :{" "}
                                    {courseProgress
                                        .filter((c) => c.updatedAt)
                                        .sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0))[0]
                                        ?.updatedAt?.toLocaleDateString("fr-FR") || "N/A"}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Quota IA */}
                    <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Zap className="w-4 h-4 text-teal-700" />
                            <span className="text-sm font-semibold text-gray-700">Quota IA</span>
                        </div>
                        {quota ? (
                            <div className="space-y-3">
                                {/* Exo assistant */}
                                <div>
                                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                                        <span>Assistant exercices</span>
                                        <span className={exoPercent >= 90 ? "text-red-500 font-semibold" : ""}>
                                            {quota.exoAssistantUsed}/{quota.exoAssistantLimit}
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${exoPercent >= 90 ? "bg-red-400" : exoPercent >= 70 ? "bg-orange-400" : "bg-teal-500"
                                                }`}
                                            style={{ width: `${Math.min(exoPercent, 100)}%` }}
                                        />
                                    </div>
                                </div>
                                {/* Video assistant */}
                                <div>
                                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                                        <span>Assistant vidéo</span>
                                        <span className={videoPercent >= 90 ? "text-red-500 font-semibold" : ""}>
                                            {quota.videoAssistantUsed}/{quota.videoAssistantLimit}
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${videoPercent >= 90 ? "bg-red-400" : videoPercent >= 70 ? "bg-orange-400" : "bg-teal-500"
                                                }`}
                                            style={{ width: `${Math.min(videoPercent, 100)}%` }}
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-gray-400 pt-1">
                                    Plan : <span className="font-medium capitalize">{quota.plan}</span> · Réinitialisation quotidienne
                                </p>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400">Données non disponibles</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Modal ajout enfant ───────────────────────────────────────────────────────
function AddChildModal({
    onClose,
    onAdd,
}: {
    onClose: () => void;
    onAdd: (email: string) => Promise<{ found: boolean }>;
}) {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "found" | "pending" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");

    const handleSubmit = async () => {
        if (!email.trim()) return;
        setStatus("loading");
        setErrorMsg("");
        try {
            const { found } = await onAdd(email.trim().toLowerCase());
            setStatus(found ? "found" : "pending");
        } catch {
            setStatus("error");
            setErrorMsg("Une erreur est survenue. Réessayez.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
                {/* Fermer */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center">
                        <UserPlus className="w-5 h-5 text-teal-700" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">Ajouter un enfant</h3>
                        <p className="text-xs text-gray-500">Entrez l'email du compte de votre enfant</p>
                    </div>
                </div>

                {status === "idle" || status === "loading" || status === "error" ? (
                    <>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                            placeholder="email@exemple.com"
                            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 mb-3"
                        />
                        {errorMsg && (
                            <p className="text-xs text-red-500 mb-3">{errorMsg}</p>
                        )}
                        <button
                            onClick={handleSubmit}
                            disabled={status === "loading" || !email.trim()}
                            className="w-full bg-teal-700 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-teal-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {status === "loading" ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Recherche…</>
                            ) : "Lier cet enfant"}
                        </button>
                    </>
                ) : status === "found" ? (
                    <div className="text-center py-4">
                        <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
                        <p className="font-semibold text-gray-800 mb-1">Enfant lié avec succès !</p>
                        <p className="text-sm text-gray-500 mb-5">Le compte a été trouvé et ajouté à votre espace.</p>
                        <button onClick={onClose} className="bg-teal-700 text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-teal-800 transition">
                            Fermer
                        </button>
                    </div>
                ) : (
                    <div className="text-center py-4">
                        <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3">
                            <AlertCircle className="w-5 h-5 text-amber-500" />
                        </div>
                        <p className="font-semibold text-gray-800 mb-1">Compte introuvable pour l'instant</p>
                        <p className="text-sm text-gray-500 mb-1">
                            L'email <span className="font-medium text-gray-700">{email}</span> a été enregistré.
                        </p>
                        <p className="text-xs text-gray-400 mb-5">
                            L'enfant sera automatiquement lié dès qu'il créera son compte avec cet email.
                        </p>
                        <button onClick={onClose} className="bg-teal-700 text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-teal-800 transition">
                            Compris
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function ParentDashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [resolving, setResolving] = useState(false);
    const [childrenData, setChildrenData] = useState<ChildFullData[]>([]);
    const [pendingEmails, setPendingEmails] = useState<string[]>([]);
    const [parentName, setParentName] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [linkRequests, setLinkRequests] = useState<LinkRequest[]>([]);
    const [error, setError] = useState("");

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.push("/login");
                return;
            }

            try {
                // 1. Vérifier le rôle
                const userSnap = await getDoc(doc(db, "users", user.uid));
                if (!userSnap.exists()) {
                    router.push("/");
                    return;
                }
                const userData = userSnap.data();
                if (userData.role !== "parent" && userData.role !== "tuteur") {
                    router.push("/");
                    return;
                }

                setParentName(userData.prenom || userData.nom || "");
                setPendingEmails(userData.pendingChildrenEmails || []);

                // 2. Résoudre les emails en attente
                setResolving(true);
                await resolvePendingChildren(user.uid);
                setResolving(false);

                // 3. Charger les enfants liés
                const children = await getLinkedChildren(user.uid);

                // 4. Charger les données de chaque enfant en parallèle
                const allData = await Promise.all(children.map((child) => getChildFullData(child)));
                setChildrenData(allData);

                // 5. Charger les linkRequests en attente
                const requests = await getPendingLinkRequests(user.uid);
                setLinkRequests(requests);

                // Mettre à jour les emails encore en attente
                const refreshed = await getDoc(doc(db, "users", user.uid));
                if (refreshed.exists()) {
                    setPendingEmails(refreshed.data().pendingChildrenEmails || []);
                }
            } catch (err) {
                console.error("Erreur dashboard parent :", err);
                setError("Impossible de charger les données. Veuillez réessayer.");
            } finally {
                setLoading(false);
            }
        });

        return () => unsub();
    }, [router]);

    // ── Confirmer une liaison ──
    const handleConfirmLink = async (req: LinkRequest) => {
        const user = auth.currentUser;
        if (!user) return;
        await confirmLinkRequest(req.id, user.uid, req.childId, req.childEmail);
        // Retirer la notif
        setLinkRequests((prev) => prev.filter((r) => r.id !== req.id));
        // Charger et afficher la carte de l'enfant
        const childSnap = await getDoc(doc(db, "users", req.childId));
        if (childSnap.exists()) {
            const cd = childSnap.data();
            const childInfo = {
                uid: req.childId,
                nom: cd.nom || "",
                prenom: cd.prenom || "",
                email: cd.email || "",
            };
            const newData = await getChildFullData(childInfo);
            setChildrenData((prev) => {
                if (prev.find((d) => d.info.uid === req.childId)) return prev;
                return [...prev, newData];
            });
        }
    };

    const handleRejectLink = async (req: LinkRequest) => {
        await rejectLinkRequest(req.id);
        setLinkRequests((prev) => prev.filter((r) => r.id !== req.id));
    };
    const handleAddChild = async (email: string): Promise<{ found: boolean }> => {
        const user = auth.currentUser;
        if (!user) return { found: false };

        // Chercher si l'email correspond à un compte existant
        const { collection, query, where, getDocs } = await import("firebase/firestore");
        const q = query(collection(db, "users"), where("email", "==", email));
        const snap = await getDocs(q);

        const parentRef = doc(db, "users", user.uid);

        if (!snap.empty) {
            // Compte trouvé → lier directement
            const childId = snap.docs[0].id;
            await updateDoc(parentRef, { linkedStudents: arrayUnion(childId) });

            // Recharger les données de ce nouvel enfant
            const childInfo = {
                uid: childId,
                nom: snap.docs[0].data().nom || "",
                prenom: snap.docs[0].data().prenom || "",
                email: snap.docs[0].data().email || "",
            };
            const newChildData = await getChildFullData(childInfo);
            setChildrenData((prev) => {
                // Éviter les doublons
                if (prev.find((d) => d.info.uid === childId)) return prev;
                return [...prev, newChildData];
            });
            return { found: true };
        } else {
            // Pas encore inscrit → stocker en pending
            await updateDoc(parentRef, { pendingChildrenEmails: arrayUnion(email) });
            setPendingEmails((prev) => (prev.includes(email) ? prev : [...prev, email]));
            return { found: false };
        }
    };

    // ── Stats globales ──
    const totalMinutes = childrenData.reduce(
        (sum, d) => sum + d.videoSummary.totalMinutesWatched,
        0
    );
    const totalDone = childrenData.reduce(
        (sum, d) => sum + d.courseProgress.filter((c) => c.status === "done").length,
        0
    );
    const totalInProgress = childrenData.reduce(
        (sum, d) => sum + d.courseProgress.filter((c) => c.status === "in_progress").length,
        0
    );

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-3 text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin text-teal-700" />
                    <span className="text-sm">
                        {resolving ? "Liaison des comptes en cours…" : "Chargement du dashboard…"}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Modal */}
            {showAddModal && (
                <AddChildModal
                    onClose={() => setShowAddModal(false)}
                    onAdd={handleAddChild}
                />
            )}

            {/* Header */}
            <div className="bg-teal-700 text-white">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <Users className="w-6 h-6 opacity-80" />
                                <span className="text-sm font-medium uppercase tracking-widest opacity-80">
                                    Espace parent
                                </span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold">
                                Bonjour{parentName ? `, ${parentName}` : ""} 👋
                            </h1>
                            <p className="text-teal-100 text-sm mt-1">
                                Suivez la progression de vos enfants en temps réel
                            </p>
                        </div>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 bg-white/15 hover:bg-white/25 transition text-white text-sm font-medium px-4 py-2.5 rounded-xl border border-white/20 relative"
                        >
                            <UserPlus className="w-4 h-4" />
                            <span className="hidden sm:inline">Ajouter un enfant</span>
                            <span className="sm:hidden">Ajouter</span>
                            {linkRequests.length > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                                    {linkRequests.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
                {/* Erreur */}
                {error && (
                    <div className="mb-6 flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {/* ── Alertes liaison en attente ── */}
                {linkRequests.length > 0 && (
                    <div className="mb-6 space-y-3">
                        {linkRequests.map((req) => (
                            <div
                                key={req.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-teal-100 rounded-2xl px-5 py-4 shadow-sm"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
                                        <Bell className="w-4 h-4 text-teal-700" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800">
                                            {req.childName || req.childEmail} vient de s'inscrire
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {req.childEmail} · Voulez-vous lier ce compte à votre espace ?
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => handleConfirmLink(req)}
                                        className="flex items-center gap-1.5 bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-teal-800 transition"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        Confirmer
                                    </button>
                                    <button
                                        onClick={() => handleRejectLink(req)}
                                        className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-200 transition"
                                    >
                                        <X className="w-4 h-4" />
                                        Ignorer
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Stats globales */}
                {childrenData.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                        {[
                            {
                                icon: Users,
                                label: "Enfant(s) suivi(s)",
                                value: childrenData.length,
                                color: "text-teal-700",
                                bg: "bg-teal-50",
                            },
                            {
                                icon: CheckCircle,
                                label: "Cours terminés",
                                value: totalDone,
                                color: "text-green-600",
                                bg: "bg-green-50",
                            },
                            {
                                icon: TrendingUp,
                                label: "Cours en cours",
                                value: totalInProgress,
                                color: "text-blue-600",
                                bg: "bg-blue-50",
                            },
                            {
                                icon: Clock,
                                label: "Minutes regardées",
                                value: totalMinutes,
                                color: "text-orange-500",
                                bg: "bg-orange-50",
                            },
                        ].map(({ icon: Icon, label, value, color, bg }) => (
                            <div key={label} className={`${bg} rounded-2xl p-4`}>
                                <Icon className={`w-5 h-5 ${color} mb-2`} />
                                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                                <p className="text-xs text-gray-600 mt-0.5">{label}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Liste des enfants */}
                {childrenData.length > 0 ? (
                    <div>
                        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">
                            Mes enfants
                        </h2>
                        <div className="space-y-3">
                            {childrenData.map((d) => (
                                <ChildCard key={d.info.uid} data={d} />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                        <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-700 font-semibold mb-1">Aucun enfant lié pour l'instant</p>
                        <p className="text-gray-400 text-sm max-w-sm mx-auto">
                            Les comptes de vos enfants seront automatiquement liés dès qu'ils créeront leur
                            compte avec l'email que vous avez renseigné.
                        </p>
                    </div>
                )}

                {/* Emails encore en attente */}
                {pendingEmails.length > 0 && (
                    <div className="mt-6 bg-amber-50 border border-amber-100 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            <span className="text-sm font-semibold text-amber-800">
                                {pendingEmails.length} compte(s) en attente d'inscription
                            </span>
                        </div>
                        <p className="text-xs text-amber-700 mb-3">
                            Ces enfants ne se sont pas encore inscrits sur Rosaine Academy. Ils seront
                            automatiquement liés à votre espace dès leur inscription.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {pendingEmails.map((email) => (
                                <span
                                    key={email}
                                    className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs"
                                >
                                    {email}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}