"use client";
import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { Send, Camera } from "lucide-react";
import { MathJax } from "better-react-mathjax";
import { buildApiUrl, apiConfig } from "@/config/api";
import { auth } from "@/firebase";
import { preprocessLatex } from "@/components/admin/utils/latexUtils";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ExtractedExo {
    id: string;
    title: string;
    statement?: string;
    difficulty?: string;
    tags?: string[];
}

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    imagePreview?: string;
}

// Handle exposé au parent pour déclencher l'upload image depuis la page PDF
export interface PdfAssistantHandle {
    receiveCapture: (file: File) => void;
}

// ── Rendu LaTeX ───────────────────────────────────────────────────────────────
const renderContent = (text: string) => {
    if (!text) return null;
    const processed = preprocessLatex(text);
    return processed
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
        .map((p, i) => {
            const isDisplay = p.startsWith("\\[") || p.startsWith("$$");
            return (
                <div
                    key={i}
                    className={`text-sm leading-relaxed ${isDisplay ? "my-3 text-center" : "mb-2"}`}
                >
                    <MathJax dynamic hideUntilTypeset="first">{p}</MathJax>
                </div>
            );
        });
};

// ── Composant ─────────────────────────────────────────────────────────────────
const PdfAssistantPanel = forwardRef<PdfAssistantHandle>((_, ref) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [question, setQuestion] = useState("");
    const [loading, setLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [activeExos, setActiveExos] = useState<ExtractedExo[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Ref pour accès aux messages dans les callbacks sans closure stale
    const messagesRef = useRef<Message[]>([]);
    useEffect(() => { messagesRef.current = messages; }, [messages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Copier-coller d'images
    useEffect(() => {
        const handlePaste = async (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.startsWith("image")) {
                    e.preventDefault();
                    const blob = items[i].getAsFile();
                    if (blob) await receiveCapture(blob);
                    break;
                }
            }
        };
        document.addEventListener("paste", handlePaste);
        return () => document.removeEventListener("paste", handlePaste);
    }, []); // pas de dépendance sur activeExos — on utilise la ref

    // Ref pour activeExos (évite le problème de closure dans les handlers)
    const activeExosRef = useRef<ExtractedExo[]>([]);
    useEffect(() => {
        activeExosRef.current = activeExos;
    }, [activeExos]);

    // ── Upload image / capture ────────────────────────────────────────────────
    const receiveCapture = async (file: File) => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            addMsg("assistant", "❌ Vous devez être connecté pour utiliser l'assistant.");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            addMsg("assistant", "❌ Image trop lourde (max 5MB).");
            return;
        }

        // Aperçu immédiat
        const reader = new FileReader();
        reader.onload = (e) => {
            const imagePreview = e.target?.result as string;
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now().toString(),
                    role: "user",
                    content: "",
                    timestamp: new Date(),
                    imagePreview,
                },
            ]);
        };
        reader.readAsDataURL(file);

        setUploadingImage(true);

        try {
            const formData = new FormData();
            formData.append("file", file);
            const apiUrl = buildApiUrl(apiConfig.endpoints.assistant.extractExercise, {
                user_id: userId,
            });
            const res = await fetch(apiUrl, { method: "POST", body: formData });

            if (res.status === 429) {
                const data = await res.json();
                const hoursLeft = hoursUntilMidnight();
                addMsg(
                    "assistant",
                    `🚫 Limite atteinte (${data.quota?.used}/${data.quota?.limit})\n\n⏰ Réinitialisation dans ${hoursLeft}h`
                );
                return;
            }

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();

            if (data.success && data.exercise) {
                const exo: ExtractedExo = {
                    id: data.exercise.id,
                    title: data.exercise.title,
                    statement: data.exercise.statement,
                    difficulty: data.exercise.difficulty,
                    tags: data.exercise.tags,
                };
                setActiveExos((prev) => [...prev, exo]);

                let content = `✅ **${data.exercise.title}**\n\n${data.exercise.statement}`;
                if (data.exercise.questions?.length > 0) {
                    content += `\n\n**Questions :**\n\n${data.exercise.questions
                        .map((q: string, i: number) => `${i + 1}. ${q}`)
                        .join("\n\n")}`;
                }
                if (data.exercise.warning) content += `\n\n⚠️ ${data.exercise.warning}`;

                addMsg("assistant", content);
            } else {
                throw new Error(data.error || "Erreur extraction");
            }
        } catch (err) {
            console.error(err);
            addMsg("assistant", "❌ Impossible d'analyser l'image. Vérifiez que l'exercice est bien visible.");
        } finally {
            setUploadingImage(false);
        }
    };

    // Exposer receiveCapture au parent via ref
    useImperativeHandle(ref, () => ({ receiveCapture }), []);

    // ── Question texte ────────────────────────────────────────────────────────
    const askAI = async () => {
        if (!question.trim()) return;
        const userId = auth.currentUser?.uid;
        if (!userId) {
            addMsg("assistant", "❌ Connexion requise.");
            return;
        }

        const userMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content: question.trim(),
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setQuestion("");
        setLoading(true);

        try {
            const params = new URLSearchParams({
                user_id: userId,
                question: userMsg.content,
                user_level: "Terminal",
                user_subject: "Maths",
            });

            // Historique conversation — depuis les messages actuels (pas dans setState)
            const currentMessages = messagesRef.current;
            const history = currentMessages
                .filter((m) => !m.imagePreview)
                .slice(-6)
                .map((m) => `${m.role === "user" ? "Élève" : "Assistant"}: ${m.content}`)
                .join("\n");
            if (history) params.append("conversation_history", history);

            // Exercices actifs extraits du PDF
            const currentExos = activeExosRef.current;
            if (currentExos.length > 0) {
                params.append(
                    "active_exercises",
                    JSON.stringify(
                        currentExos.map((ex) => ({
                            id: ex.id,
                            title: ex.title,
                            statement: ex.statement || "",
                            difficulty: ex.difficulty || "",
                            tags: ex.tags?.join(", ") || "",
                            source: "pdf",
                        }))
                    )
                );
            }

            const apiUrl = buildApiUrl(
                apiConfig.endpoints.assistant.exo,
                Object.fromEntries(params)
            );
            const res = await fetch(apiUrl);

            if (res.status === 429) {
                const data = await res.json();
                const hoursLeft = hoursUntilMidnight();
                const minsLeft = minutesUntilMidnight();
                addMsg(
                    "assistant",
                    `🚫 Limite quotidienne atteinte !\n\n⏰ Réinitialisation dans ${hoursLeft}h${minsLeft.toString().padStart(2, "0")}\n\n${data.quota?.plan === "gratuit" ? "🎯 Passez au plan Élève pour 150 questions/jour !" : ""}`
                );
                return;
            }

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            addMsg("assistant", data.response || data.error || "Erreur.");
        } catch (err) {
            console.error(err);
            addMsg("assistant", "❌ Erreur de connexion à l'assistant.");
        } finally {
            setLoading(false);
            textareaRef.current?.focus();
        }
    };

    // ── Helpers ───────────────────────────────────────────────────────────────
    const addMsg = (role: "user" | "assistant", content: string) => {
        setMessages((prev) => [
            ...prev,
            { id: (Date.now() + Math.random()).toString(), role, content, timestamp: new Date() },
        ]);
    };

    const hoursUntilMidnight = () => {
        const now = new Date();
        const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
        return Math.floor((midnight.getTime() - now.getTime()) / (1000 * 60 * 60));
    };

    const minutesUntilMidnight = () => {
        const now = new Date();
        const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
        return Math.floor(((midnight.getTime() - now.getTime()) % (1000 * 60 * 60)) / (1000 * 60));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            askAI();
        }
    };

    // ── Rendu ─────────────────────────────────────────────────────────────────
    return (
        <div className="h-full flex flex-col bg-white">
            {/* Header */}
            <div className="px-4 py-3 border-b bg-gradient-to-r from-green-50 to-emerald-100 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-green-900">🤖 Assistant IA</span>
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full font-medium">
                        PDF
                    </span>
                </div>
                <p className="text-xs text-green-700 mt-0.5">
                    Sélectionne une zone dans le PDF → Résoudre
                </p>

                {/* Exercices extraits actifs */}
                {activeExos.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {activeExos.slice(0, 3).map((ex) => (
                            <div
                                key={ex.id}
                                className="flex items-center gap-1 bg-white border border-green-200 px-2 py-0.5 rounded-full text-xs text-gray-700"
                            >
                                <span className="text-purple-500">📄</span>
                                <span className="truncate max-w-[100px]">{ex.title}</span>
                                <button
                                    onClick={() =>
                                        setActiveExos((prev) => prev.filter((e) => e.id !== ex.id))
                                    }
                                    className="text-red-400 hover:text-red-600 ml-0.5"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                        {activeExos.length > 3 && (
                            <span className="text-xs text-gray-400">+{activeExos.length - 3}</span>
                        )}
                    </div>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4 text-gray-400">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center text-3xl mb-4">
                            📐
                        </div>
                        <p className="text-sm font-medium text-gray-600 mb-1">
                            Sélectionne un exercice dans le PDF
                        </p>
                        <p className="text-xs text-gray-400">
                            Clique sur <strong>Sélectionner</strong>, trace une zone,
                            puis <strong>Résoudre</strong>
                        </p>
                        <div className="mt-4 text-xs text-gray-400 space-y-1">
                            <p>💡 Tu peux aussi :</p>
                            <p>• Envoyer une photo de ta feuille</p>
                            <p>• Coller une image (Ctrl+V)</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[88%] rounded-2xl px-4 py-3 ${msg.role === "user"
                                        ? "bg-green-600 text-white"
                                        : "bg-gray-100 text-gray-800"
                                        }`}
                                >
                                    {msg.role === "assistant" && (
                                        <p className="text-xs font-semibold text-green-700 mb-1.5">
                                            🤖 Assistant
                                        </p>
                                    )}
                                    {msg.imagePreview && (
                                        <img
                                            src={msg.imagePreview}
                                            alt="Capture PDF"
                                            className="max-w-full rounded-lg border-2 border-white/30 shadow mb-2"
                                            style={{ maxHeight: 260 }}
                                        />
                                    )}
                                    {msg.content && (
                                        <div className="leading-relaxed">
                                            {renderContent(msg.content)}
                                        </div>
                                    )}
                                    <span className="text-xs opacity-60 mt-1.5 block">
                                        {msg.timestamp.toLocaleTimeString("fr-FR", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {(loading || uploadingImage) && (
                            <div className="flex justify-start">
                                <div className="bg-gray-100 rounded-2xl px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                                        <div
                                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                            style={{ animationDelay: "0.1s" }}
                                        />
                                        <div
                                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                            style={{ animationDelay: "0.2s" }}
                                        />
                                        <span className="text-xs text-gray-500 ml-1">
                                            {uploadingImage ? "Analyse…" : "Réflexion…"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Saisie */}
            <div className="border-t bg-white p-3 flex-shrink-0">
                <div className="flex items-end gap-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) receiveCapture(f);
                            e.target.value = "";
                        }}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading || uploadingImage}
                        className="p-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition disabled:opacity-50 flex-shrink-0"
                        title="Envoyer une photo"
                    >
                        <Camera size={18} />
                    </button>
                    <textarea
                        ref={textareaRef}
                        rows={1}
                        className="flex-1 border-2 border-gray-200 focus:border-green-500 p-2.5 rounded-xl resize-none focus:outline-none text-sm transition"
                        placeholder="Pose ta question sur l'exercice…"
                        value={question}
                        onChange={(e) => {
                            setQuestion(e.target.value);
                            e.target.style.height = "auto";
                            e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
                        }}
                        onKeyDown={handleKeyDown}
                        disabled={loading || uploadingImage}
                    />
                    <button
                        onClick={askAI}
                        disabled={loading || uploadingImage || !question.trim()}
                        className="p-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl disabled:opacity-50 transition flex-shrink-0"
                    >
                        <Send size={18} />
                    </button>
                </div>
                <p className="text-xs text-gray-400 mt-1.5 text-center">
                    <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs border">Entrée</kbd> pour envoyer
                    {" · "}
                    <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs border">Ctrl+V</kbd> pour coller
                </p>
            </div>
        </div>
    );
});

PdfAssistantPanel.displayName = "PdfAssistantPanel";
export default PdfAssistantPanel;