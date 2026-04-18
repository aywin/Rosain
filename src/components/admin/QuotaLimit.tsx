"use client";
import { useState, useEffect, useCallback } from "react";
import { db } from "@/firebase";
import {
    collection, doc, setDoc, getDocs, getDoc,
    updateDoc, deleteDoc, serverTimestamp
} from "firebase/firestore";
import {
    Save, RefreshCw, Plus, AlertCircle, CheckCircle,
    BarChart2, Settings, Users, TrendingUp, DollarSign,
    Zap, Video, Image, ChevronUp, ChevronDown, Shield, ShieldOff, Trash2
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface PlanConfig {
    name: string;
    exo_assistant: number;
    video_assistant: number;
    image_upload: number;
    version: number;
}

interface QuotaUser {
    id: string;
    plan: string;
    usage_today: { exo_assistant: number; video_assistant: number; image_upload: number };
    daily_limits: { exo_assistant: number; video_assistant: number; image_upload: number };
    blocked?: boolean;
    last_reset?: any;
    displayName?: string; // nom + prenom depuis users/
}

interface DayStats {
    date: string;
    total_requests: number;
    total_cost_usd: number;
    is_today?: boolean;
}

interface Analytics {
    today: { exo_assistant: number; video_assistant: number; image_upload: number; total: number };
    today_cost_usd: number;
    estimated_monthly_cost_usd: number;
    plan_counts: { gratuit: number; eleve: number; famille: number };
    total_users: number;
    top_users: Array<{
        user_id: string; plan: string; total_requests: number;
        exo_assistant: number; video_assistant: number; image_upload: number;
        estimated_cost_usd: number; displayName?: string;
    }>;
    seven_days: DayStats[];
    cost_per_request_usd: number;
}

const DEFAULT_PLANS: Record<string, PlanConfig> = {
    gratuit: { name: "Plan Gratuit", exo_assistant: 5, video_assistant: 5, image_upload: 0, version: 1 },
    eleve: { name: "Plan Élève", exo_assistant: 30, video_assistant: 20, image_upload: 10, version: 1 },
    famille: { name: "Plan Famille", exo_assistant: 50, video_assistant: 30, image_upload: 20, version: 1 },
};

const COST_PER_REQUEST = 0.00185; // Gemini 2.5 Flash estimé
const PLAN_COLORS: Record<string, string> = {
    gratuit: "bg-gray-100 text-gray-700",
    eleve: "bg-teal-50 text-teal-700",
    famille: "bg-purple-50 text-purple-700",
};
const PLAN_BADGES: Record<string, string> = {
    gratuit: "bg-gray-200 text-gray-600",
    eleve: "bg-teal-100 text-teal-700 border border-teal-200",
    famille: "bg-purple-100 text-purple-700 border border-purple-200",
};

// ── Mini bar chart ────────────────────────────────────────────────────────────
function BarChart({ data }: { data: DayStats[] }) {
    const max = Math.max(...data.map(d => d.total_requests), 1);
    const days = ["L", "M", "M", "J", "V", "S", "D"];
    return (
        <div className="flex items-end gap-1.5 h-24">
            {data.map((d, i) => {
                const height = Math.max((d.total_requests / max) * 100, 2);
                const date = new Date(d.date + "T00:00:00Z");
                const dayLabel = date.toLocaleDateString("fr-FR", { weekday: "short" }).slice(0, 1).toUpperCase();
                return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10">
                            {d.total_requests} req · ${d.total_cost_usd.toFixed(3)}
                        </div>
                        <div className="w-full flex items-end" style={{ height: "80px" }}>
                            <div
                                className={`w-full rounded-t transition-all duration-500 ${d.is_today ? "bg-teal-500" : "bg-teal-200 group-hover:bg-teal-300"}`}
                                style={{ height: `${height}%` }}
                            />
                        </div>
                        <span className="text-[10px] text-gray-400">{dayLabel}</span>
                    </div>
                );
            })}
        </div>
    );
}

// ── Barre de progression ──────────────────────────────────────────────────────
function UsageBar({ used, limit, color = "teal" }: { used: number; limit: number; color?: string }) {
    const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
    const barColor = pct >= 90 ? "bg-red-400" : pct >= 70 ? "bg-orange-400" : `bg-${color}-500`;
    return (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
    );
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function QuotaLimit() {
    const [tab, setTab] = useState<"analytics" | "limits">("analytics");
    const [plans, setPlans] = useState<Record<string, PlanConfig>>(DEFAULT_PLANS);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [quotaUsers, setQuotaUsers] = useState<QuotaUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [analyticsLoading, setAnalyticsLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [initialized, setInitialized] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [actionUserId, setActionUserId] = useState<string | null>(null);

    // ── Charger les plans ──
    const loadPlans = useCallback(async () => {
        try {
            const snap = await getDocs(collection(db, "plan_configs"));
            setInitialized(!snap.empty);
            if (!snap.empty) {
                const loaded: Record<string, PlanConfig> = {};
                snap.forEach(d => { loaded[d.id] = d.data() as PlanConfig; });
                setPlans(loaded);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    // ── Charger analytics depuis Firestore ──
    const loadAnalytics = useCallback(async () => {
        setAnalyticsLoading(true);
        try {
            // 1. Tous les quotas actifs
            const quotasSnap = await getDocs(collection(db, "quotas"));
            const users: QuotaUser[] = [];
            const todayStats = { exo_assistant: 0, video_assistant: 0, image_upload: 0, total: 0 };
            const planCounts = { gratuit: 0, eleve: 0, famille: 0 };
            const userIds: string[] = [];

            quotasSnap.forEach(d => {
                const data = d.data() as QuotaUser;
                data.id = d.id;
                users.push(data);
                userIds.push(d.id);
                const usage = data.usage_today || {};
                const total = (usage.exo_assistant || 0) + (usage.video_assistant || 0) + (usage.image_upload || 0);
                todayStats.exo_assistant += usage.exo_assistant || 0;
                todayStats.video_assistant += usage.video_assistant || 0;
                todayStats.image_upload += usage.image_upload || 0;
                todayStats.total += total;
                const plan = data.plan || "gratuit";
                if (plan in planCounts) planCounts[plan as keyof typeof planCounts]++;
            });

            // Fetch noms en parallèle (batch de 30 max)
            const namesMap: Record<string, string> = {};
            const BATCH = 30;
            for (let i = 0; i < userIds.length; i += BATCH) {
                const batch = userIds.slice(i, i + BATCH);
                const nameSnaps = await Promise.all(batch.map(uid => getDoc(doc(db, "users", uid))));
                nameSnaps.forEach(snap => {
                    if (snap.exists()) {
                        const d = snap.data();
                        const name = [d.prenom, d.nom].filter(Boolean).join(" ");
                        namesMap[snap.id] = name || snap.id.slice(0, 8) + "…";
                    }
                });
            }

            // Enrichir les users avec leur nom
            users.forEach(u => { u.displayName = namesMap[u.id] || undefined; });
            setQuotaUsers(users);

            // Top users
            const topUsers = users
                .map(u => {
                    const usage = u.usage_today || {};
                    const total = (usage.exo_assistant || 0) + (usage.video_assistant || 0) + (usage.image_upload || 0);
                    return {
                        user_id: u.id, plan: u.plan, total_requests: total,
                        ...usage, estimated_cost_usd: +(total * COST_PER_REQUEST).toFixed(4),
                        displayName: namesMap[u.id] || undefined,
                    };
                })
                .filter(u => u.total_requests > 0)
                .sort((a, b) => b.total_requests - a.total_requests)
                .slice(0, 10);

            // 2. Graphique 7 jours
            const sevenDays: DayStats[] = [];
            const today = new Date(Date.now());
            today.setUTCHours(0, 0, 0, 0);

            for (let i = 6; i >= 0; i--) {
                const d = new Date(today);
                d.setUTCDate(d.getUTCDate() - i);
                const dateStr = d.toISOString().split("T")[0];
                const isToday = i === 0;

                if (isToday) {
                    sevenDays.push({ date: dateStr, total_requests: todayStats.total, total_cost_usd: +(todayStats.total * COST_PER_REQUEST).toFixed(4), is_today: true });
                } else {
                    try {
                        const logDoc = await getDoc(doc(db, "usage_logs", dateStr));
                        if (logDoc.exists()) {
                            const ld = logDoc.data();
                            sevenDays.push({ date: dateStr, total_requests: ld.total_requests || 0, total_cost_usd: +(ld.total_cost_usd || 0).toFixed(4) });
                        } else {
                            sevenDays.push({ date: dateStr, total_requests: 0, total_cost_usd: 0 });
                        }
                    } catch { sevenDays.push({ date: dateStr, total_requests: 0, total_cost_usd: 0 }); }
                }
            }

            const avgDaily = sevenDays.reduce((s, d) => s + d.total_requests, 0) / 7;

            setAnalytics({
                today: todayStats,
                today_cost_usd: +(todayStats.total * COST_PER_REQUEST).toFixed(4),
                estimated_monthly_cost_usd: +(avgDaily * 30 * COST_PER_REQUEST).toFixed(2),
                plan_counts: planCounts,
                total_users: users.length,
                top_users: topUsers,
                seven_days: sevenDays,
                cost_per_request_usd: COST_PER_REQUEST,
            });
        } catch (e) { console.error("Erreur analytics:", e); }
        finally { setAnalyticsLoading(false); }
    }, []);

    useEffect(() => { loadPlans(); loadAnalytics(); }, []);

    // ── Actions ──
    const initializePlans = async () => {
        setSaving(true);
        try {
            for (const [planId, planData] of Object.entries(DEFAULT_PLANS)) {
                await setDoc(doc(db, "plan_configs", planId), { ...planData, updated_at: serverTimestamp() });
            }
            setMessage({ type: "success", text: "✅ Plans créés avec succès !" });
            setInitialized(true);
            await loadPlans();
        } catch { setMessage({ type: "error", text: "❌ Erreur lors de la création des plans" }); }
        finally { setSaving(false); }
    };

    const savePlan = async (planId: string) => {
        setSaving(true);
        try {
            await setDoc(doc(db, "plan_configs", planId), { ...plans[planId], updated_at: serverTimestamp() });
            setMessage({ type: "success", text: `✅ Plan "${plans[planId].name}" sauvegardé !` });
        } catch { setMessage({ type: "error", text: "❌ Erreur lors de la sauvegarde" }); }
        finally { setSaving(false); }
    };

    const updateUserPlan = async (userId: string, newPlan: string) => {
        setActionUserId(userId);
        try {
            const planLimits = plans[newPlan];
            if (!planLimits) return;
            await updateDoc(doc(db, "quotas", userId), {
                plan: newPlan,
                daily_limits: { exo_assistant: planLimits.exo_assistant, video_assistant: planLimits.video_assistant, image_upload: planLimits.image_upload },
                updated_at: serverTimestamp(),
            });
            try { await updateDoc(doc(db, "users", userId), { plan: newPlan, updatedAt: serverTimestamp() }); } catch { }
            setMessage({ type: "success", text: `✅ Plan mis à jour → ${newPlan}` });
            await loadAnalytics();
        } catch { setMessage({ type: "error", text: "❌ Erreur mise à jour plan" }); }
        finally { setActionUserId(null); }
    };

    const toggleBlockUser = async (userId: string, currentlyBlocked: boolean) => {
        setActionUserId(userId);
        try {
            if (!currentlyBlocked) {
                await updateDoc(doc(db, "quotas", userId), {
                    daily_limits: { exo_assistant: 0, video_assistant: 0, image_upload: 0 },
                    blocked: true, updated_at: serverTimestamp(),
                });
            } else {
                const quotaDoc = await getDoc(doc(db, "quotas", userId));
                const plan = quotaDoc.data()?.plan || "gratuit";
                const planLimits = plans[plan] || DEFAULT_PLANS[plan];
                await updateDoc(doc(db, "quotas", userId), {
                    daily_limits: { exo_assistant: planLimits.exo_assistant, video_assistant: planLimits.video_assistant, image_upload: planLimits.image_upload },
                    blocked: false, updated_at: serverTimestamp(),
                });
            }
            setMessage({ type: "success", text: `✅ User ${currentlyBlocked ? "débloqué" : "bloqué"}` });
            await loadAnalytics();
        } catch { setMessage({ type: "error", text: "❌ Erreur action user" }); }
        finally { setActionUserId(null); }
    };

    const deleteUser = async (userId: string, displayName?: string) => {
        const label = displayName || userId.slice(0, 10) + "…";
        if (!confirm(`Supprimer le quota de "${label}" ? Cette action est irréversible.`)) return;
        setActionUserId(userId);
        try {
            await deleteDoc(doc(db, "quotas", userId));
            setMessage({ type: "success", text: `✅ Quota de "${label}" supprimé` });
            await loadAnalytics();
        } catch { setMessage({ type: "error", text: "❌ Erreur suppression quota" }); }
        finally { setActionUserId(null); }
    };

    const updateField = (planId: string, field: keyof PlanConfig, value: string | number) => {
        setPlans(prev => ({ ...prev, [planId]: { ...prev[planId], [field]: value } }));
    };

    // ─────────────────────────────────────────────────────────────────────────
    // ── RENDU ────────────────────────────────────────────────────────────────
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestion des Quotas IA</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Surveillance et contrôle de l'usage Gemini</p>
                </div>
                <button onClick={loadAnalytics} disabled={analyticsLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition disabled:opacity-50">
                    <RefreshCw size={14} className={analyticsLoading ? "animate-spin" : ""} />
                    Actualiser
                </button>
            </div>

            {/* Message */}
            {message && (
                <div className={`p-4 rounded-xl flex items-center gap-2 text-sm ${message.type === "success" ? "bg-green-50 text-green-800 border border-green-100" : "bg-red-50 text-red-800 border border-red-100"}`}>
                    {message.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {message.text}
                    <button onClick={() => setMessage(null)} className="ml-auto text-gray-400 hover:text-gray-600">×</button>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                {[
                    { id: "analytics", label: "Analytics", icon: BarChart2 },
                    { id: "limits", label: "Limites", icon: Settings },
                ].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                        <t.icon size={15} />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── TAB ANALYTICS ── */}
            {tab === "analytics" && (
                <div className="space-y-5">
                    {analyticsLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="flex items-center gap-3 text-gray-400">
                                <RefreshCw size={20} className="animate-spin" />
                                <span>Chargement des analytics…</span>
                            </div>
                        </div>
                    ) : analytics ? (
                        <>
                            {/* KPIs */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: "Requêtes aujourd'hui", value: analytics.today.total, icon: Zap, color: "text-teal-600", bg: "bg-teal-50" },
                                    { label: "Coût estimé du jour", value: `$${analytics.today_cost_usd.toFixed(3)}`, icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
                                    { label: "Coût mensuel estimé", value: `$${analytics.estimated_monthly_cost_usd.toFixed(2)}`, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
                                    { label: "Users actifs", value: analytics.total_users, icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
                                ].map(kpi => (
                                    <div key={kpi.label} className={`${kpi.bg} rounded-2xl p-4`}>
                                        <kpi.icon className={`w-5 h-5 ${kpi.color} mb-2`} />
                                        <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{kpi.label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Graphique 7 jours + répartition plans */}
                            <div className="grid md:grid-cols-2 gap-4">
                                {/* Graphique */}
                                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-semibold text-gray-700">Requêtes — 7 derniers jours</h3>
                                        <span className="text-xs text-teal-600 font-medium bg-teal-50 px-2 py-0.5 rounded-full">aujourd'hui en teal</span>
                                    </div>
                                    <BarChart data={analytics.seven_days} />
                                    <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between text-xs text-gray-400">
                                        <span>Total 7j : {analytics.seven_days.reduce((s, d) => s + d.total_requests, 0)} req</span>
                                        <span>Coût 7j : ${analytics.seven_days.reduce((s, d) => s + d.total_cost_usd, 0).toFixed(3)}</span>
                                    </div>
                                </div>

                                {/* Répartition plans */}
                                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Répartition par plan</h3>
                                    <div className="space-y-3">
                                        {Object.entries(analytics.plan_counts).map(([plan, count]) => {
                                            const pct = analytics.total_users > 0 ? Math.round((count / analytics.total_users) * 100) : 0;
                                            return (
                                                <div key={plan}>
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_BADGES[plan]}`}>
                                                            {plan}
                                                        </span>
                                                        <span className="text-gray-500 text-xs">{count} users · {pct}%</span>
                                                    </div>
                                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all duration-700 ${plan === "gratuit" ? "bg-gray-400" : plan === "eleve" ? "bg-teal-500" : "bg-purple-500"}`}
                                                            style={{ width: `${pct}%` }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-gray-50 grid grid-cols-3 gap-2 text-center">
                                        {[
                                            { label: "Exo IA", value: analytics.today.exo_assistant, icon: "📚" },
                                            { label: "Vidéo IA", value: analytics.today.video_assistant, icon: "🎥" },
                                            { label: "Images", value: analytics.today.image_upload, icon: "📸" },
                                        ].map(s => (
                                            <div key={s.label} className="bg-gray-50 rounded-xl p-2">
                                                <p className="text-base">{s.icon}</p>
                                                <p className="text-sm font-bold text-gray-800">{s.value}</p>
                                                <p className="text-[10px] text-gray-400">{s.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Top users */}
                            <div className="bg-white rounded-2xl border border-gray-100 p-5">
                                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                                    Top utilisateurs aujourd'hui
                                    <span className="ml-2 text-xs text-gray-400 font-normal">({analytics.top_users.length} actifs)</span>
                                </h3>
                                {analytics.top_users.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-6">Aucune activité aujourd'hui</p>
                                ) : (
                                    <div className="space-y-2">
                                        {analytics.top_users.map((user, i) => {
                                            const quotaUser = quotaUsers.find(q => q.id === user.user_id);
                                            const isBlocked = quotaUser?.blocked || false;
                                            const isActing = actionUserId === user.user_id;
                                            return (
                                                <div key={user.user_id} className={`flex items-center gap-3 p-3 rounded-xl transition ${isBlocked ? "bg-red-50 border border-red-100" : "bg-gray-50 hover:bg-gray-100"}`}>
                                                    {/* Rang */}
                                                    <span className="text-xs font-bold text-gray-400 w-5 text-center">{i + 1}</span>

                                                    {/* Infos user */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <p className="text-sm font-medium text-gray-800 truncate max-w-[160px]">
                                                                {user.displayName || <span className="font-mono text-xs text-gray-400">{user.user_id.slice(0, 10)}…</span>}
                                                            </p>
                                                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${PLAN_BADGES[user.plan] || PLAN_BADGES.gratuit}`}>
                                                                {user.plan}
                                                            </span>
                                                            {isBlocked && <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-100 text-red-600 font-medium">bloqué</span>}
                                                        </div>
                                                        <div className="flex items-center gap-3 text-[10px] text-gray-400">
                                                            <span>📚 {user.exo_assistant}</span>
                                                            <span>🎥 {user.video_assistant}</span>
                                                            <span>📸 {user.image_upload}</span>
                                                            <span className="text-green-600 font-medium">${user.estimated_cost_usd}</span>
                                                        </div>
                                                    </div>

                                                    {/* Total */}
                                                    <span className="text-sm font-bold text-gray-700 w-12 text-right">{user.total_requests}</span>

                                                    {/* Actions */}
                                                    <div className="flex items-center gap-1">
                                                        {/* Changer plan */}
                                                        <select
                                                            value={user.plan}
                                                            onChange={e => updateUserPlan(user.user_id, e.target.value)}
                                                            disabled={isActing}
                                                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-teal-400 disabled:opacity-50"
                                                        >
                                                            <option value="gratuit">Gratuit</option>
                                                            <option value="eleve">Élève</option>
                                                            <option value="famille">Famille</option>
                                                        </select>
                                                        {/* Bloquer/débloquer */}
                                                        <button
                                                            onClick={() => toggleBlockUser(user.user_id, isBlocked)}
                                                            disabled={isActing}
                                                            className={`p-1.5 rounded-lg transition disabled:opacity-50 ${isBlocked ? "bg-green-100 text-green-600 hover:bg-green-200" : "bg-red-50 text-red-400 hover:bg-red-100"}`}
                                                            title={isBlocked ? "Débloquer" : "Bloquer"}
                                                        >
                                                            {isBlocked ? <Shield size={13} /> : <ShieldOff size={13} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Tous les users avec quota */}
                            <div className="bg-white rounded-2xl border border-gray-100 p-5">
                                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                                    Tous les comptes
                                    <span className="ml-2 text-xs text-gray-400 font-normal">({quotaUsers.length})</span>
                                </h3>
                                <div className="space-y-2 max-h-80 overflow-y-auto">
                                    {quotaUsers.map(user => {
                                        const usage = user.usage_today || {};
                                        const limits = user.daily_limits || {};
                                        const total = (usage.exo_assistant || 0) + (usage.video_assistant || 0) + (usage.image_upload || 0);
                                        const isBlocked = user.blocked || false;
                                        const isActing = actionUserId === user.id;
                                        return (
                                            <div key={user.id} className={`p-3 rounded-xl border ${isBlocked ? "border-red-100 bg-red-50" : "border-gray-100 bg-gray-50"}`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-700 truncate max-w-[180px]">
                                                                {user.displayName || <span className="font-mono text-xs text-gray-400">{user.id.slice(0, 10)}…</span>}
                                                            </p>
                                                            <p className="text-[10px] text-gray-400 font-mono">{user.id.slice(0, 12)}…</p>
                                                        </div>
                                                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${PLAN_BADGES[user.plan] || PLAN_BADGES.gratuit}`}>{user.plan}</span>
                                                        {isBlocked && <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-100 text-red-600">bloqué</span>}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <select value={user.plan} onChange={e => updateUserPlan(user.id, e.target.value)} disabled={isActing}
                                                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none disabled:opacity-50">
                                                            <option value="gratuit">Gratuit</option>
                                                            <option value="eleve">Élève</option>
                                                            <option value="famille">Famille</option>
                                                        </select>
                                                        <button onClick={() => toggleBlockUser(user.id, isBlocked)} disabled={isActing}
                                                            className={`p-1.5 rounded-lg transition disabled:opacity-50 ${isBlocked ? "bg-green-100 text-green-600" : "bg-red-50 text-red-400"}`}>
                                                            {isBlocked ? <Shield size={13} /> : <ShieldOff size={13} />}
                                                        </button>
                                                        <button onClick={() => deleteUser(user.id, user.displayName)} disabled={isActing}
                                                            className="p-1.5 rounded-lg bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-500 transition disabled:opacity-50"
                                                            title="Supprimer le quota">
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {[
                                                        { label: "Exo", used: usage.exo_assistant || 0, limit: limits.exo_assistant || 0 },
                                                        { label: "Vidéo", used: usage.video_assistant || 0, limit: limits.video_assistant || 0 },
                                                        { label: "Image", used: usage.image_upload || 0, limit: limits.image_upload || 0 },
                                                    ].map(s => (
                                                        <div key={s.label}>
                                                            <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                                                                <span>{s.label}</span>
                                                                <span>{s.used}/{s.limit}</span>
                                                            </div>
                                                            <UsageBar used={s.used} limit={s.limit} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    ) : (
                        <p className="text-center text-gray-400 py-10">Erreur chargement analytics</p>
                    )}
                </div>
            )}

            {/* ── TAB LIMITES ── */}
            {tab === "limits" && (
                <div className="space-y-5">
                    {!initialized && (
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="text-blue-500 mt-0.5 flex-shrink-0" size={20} />
                                <div>
                                    <p className="font-semibold text-blue-900 mb-1">Initialisation requise</p>
                                    <p className="text-sm text-blue-700 mb-3">La collection plan_configs n'existe pas encore.</p>
                                    <button onClick={initializePlans} disabled={saving}
                                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
                                        <Plus size={15} /> Créer les plans
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid md:grid-cols-3 gap-4">
                        {Object.entries(plans).map(([planId, planData]) => (
                            <div key={planId} className="bg-white rounded-2xl border border-gray-100 p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-gray-800">{planData.name}</h3>
                                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">v{planData.version}</span>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { field: "exo_assistant" as keyof PlanConfig, label: "📚 Assistant Exercices", unit: "req/jour" },
                                        { field: "video_assistant" as keyof PlanConfig, label: "🎥 Assistant Vidéo", unit: "req/jour" },
                                        { field: "image_upload" as keyof PlanConfig, label: "📸 Upload Image", unit: "img/jour" },
                                    ].map(f => (
                                        <div key={f.field}>
                                            <label className="text-xs font-medium text-gray-600 mb-1 block">{f.label}</label>
                                            <div className="flex items-center gap-2">
                                                <input type="number" min="0"
                                                    value={planData[f.field] as number}
                                                    onChange={e => updateField(planId, f.field, parseInt(e.target.value) || 0)}
                                                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none" />
                                                <span className="text-xs text-gray-400 whitespace-nowrap">{f.unit}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <button onClick={() => savePlan(planId)} disabled={saving}
                                        className="flex-1 flex items-center justify-center gap-1.5 bg-teal-700 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-teal-800 transition disabled:opacity-50">
                                        <Save size={14} /> Sauvegarder
                                    </button>
                                    <button onClick={() => updateField(planId, "version", (planData.version || 1) + 1)} disabled={saving}
                                        className="p-2 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition" title="Incrémenter version">
                                        <RefreshCw size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Note */}
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-2">
                        <AlertCircle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-amber-800 space-y-1">
                            <p className="font-semibold">Limites recommandées (basées sur $20/mois)</p>
                            <p>Gratuit : 5 exo / 5 vidéo · Élève : 30 exo / 20 vidéo · Famille : 50 exo / 30 vidéo</p>
                            <p>Coût estimé par requête : ~${COST_PER_REQUEST.toFixed(4)} (Gemini 2.5 Flash)</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}