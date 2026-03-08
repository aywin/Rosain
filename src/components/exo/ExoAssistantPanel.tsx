"use client";
import { useState, useRef, useEffect } from "react";
import { X, Send, Camera, Upload, ImagePlus, Paperclip } from "lucide-react";
import { FaTimes } from "react-icons/fa";
import { MathJax } from "better-react-mathjax";
import { buildApiUrl, apiConfig } from "@/config/api";
import { auth } from "@/firebase";
import { preprocessLatex } from "@/components/admin/utils/latexUtils";

interface ExoContext {
    id: string;
    title: string;
    statement?: string;
    solution?: string;
    difficulty?: string;
    tags?: string[];
    level?: string;
    subject?: string;
    order?: number;
    source?: "photo" | "platform" | "pdf";
}

interface ExoAssistantPanelProps {
    onClose: () => void;
    exoContext?: ExoContext;
    userLevel?: string;
    userSubject?: string;
    activeExercises?: ExoContext[];
    onExercisesChange?: (exercises: ExoContext[]) => void;
    onImageCapture?: (handler: (file: File) => void) => void;
}

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    imagePreview?: string;
}

const renderMessageContent = (text: string) => {
    if (!text) return null;
    const processedText = preprocessLatex(text);
    const paragraphs = processedText
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
    return paragraphs.map((p, i) => {
        const isDisplayBlock = p.startsWith("\\[") || p.startsWith("$$");
        return (
            <div key={i} className={`text-sm leading-relaxed ${isDisplayBlock ? "my-3 text-center" : "mb-2"}`}>
                <MathJax dynamic hideUntilTypeset="first">{p}</MathJax>
            </div>
        );
    });
};

export default function ExoAssistantPanel({
    onClose,
    exoContext,
    userLevel = "Terminal",
    userSubject = "Maths",
    activeExercises: initialActiveExercises = [],
    onExercisesChange,
    onImageCapture,
}: ExoAssistantPanelProps) {
    const [question, setQuestion] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeExercises, setActiveExercises] = useState<ExoContext[]>(initialActiveExercises);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [showAttachMenu, setShowAttachMenu] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputGalleryRef = useRef<HTMLInputElement>(null);
    const fileInputCameraRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);
    const attachMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => { setActiveExercises(initialActiveExercises); }, [initialActiveExercises]);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
    useEffect(() => { if (onImageCapture) onImageCapture(handleImageUpload); }, [onImageCapture, activeExercises]);

    // Fermer le menu si clic extérieur
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
                setShowAttachMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Copier-coller
    useEffect(() => {
        const handlePaste = async (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf("image") !== -1) {
                    e.preventDefault();
                    const blob = items[i].getAsFile();
                    if (blob) await handleImageUpload(blob);
                    break;
                }
            }
        };
        document.addEventListener("paste", handlePaste);
        return () => document.removeEventListener("paste", handlePaste);
    }, [activeExercises]);

    // Drag & drop
    useEffect(() => {
        const dropZone = dropZoneRef.current;
        if (!dropZone) return;
        const handleDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragging(true); };
        const handleDragLeave = (e: DragEvent) => { e.preventDefault(); if (e.target === dropZone) setIsDragging(false); };
        const handleDrop = async (e: DragEvent) => {
            e.preventDefault(); setIsDragging(false);
            const files = e.dataTransfer?.files;
            if (files && files.length > 0 && files[0].type.startsWith("image/")) {
                await handleImageUpload(files[0]);
            }
        };
        dropZone.addEventListener("dragover", handleDragOver);
        dropZone.addEventListener("dragleave", handleDragLeave);
        dropZone.addEventListener("drop", handleDrop);
        return () => {
            dropZone.removeEventListener("dragover", handleDragOver);
            dropZone.removeEventListener("dragleave", handleDragLeave);
            dropZone.removeEventListener("drop", handleDrop);
        };
    }, [activeExercises]);

    const handleImageUpload = async (file: File) => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", content: "❌ Vous devez être connecté", timestamp: new Date() }]);
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", content: "❌ Image trop lourde (max 5MB)", timestamp: new Date() }]);
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const imagePreview = e.target?.result as string;
            setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", content: "", timestamp: new Date(), imagePreview }]);
        };
        reader.readAsDataURL(file);
        setUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const apiUrl = buildApiUrl(apiConfig.endpoints.assistant.extractExercise, { user_id: userId });
            const res = await fetch(apiUrl, { method: "POST", body: formData });
            if (res.status === 429) {
                const errorData = await res.json();
                const now = new Date();
                const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
                const hoursUntilReset = Math.floor((midnight.getTime() - now.getTime()) / (1000 * 60 * 60));
                setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: `🚫 Limite atteinte (${errorData.quota?.used}/${errorData.quota?.limit})\n\n⏰ Réinitialisation dans ${hoursUntilReset}h`, timestamp: new Date() }]);
                setUploadingImage(false);
                return;
            }
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();
            if (data.success && data.exercise) {
                const newExercise: ExoContext = {
                    id: data.exercise.id, title: data.exercise.title,
                    statement: data.exercise.statement, difficulty: data.exercise.difficulty,
                    tags: data.exercise.tags, source: "photo",
                };
                const updatedExercises = [...activeExercises, newExercise];
                setActiveExercises(updatedExercises);
                onExercisesChange?.(updatedExercises);
                let responseContent = `✅ **${data.exercise.title}**\n\n${data.exercise.statement}`;
                if (data.exercise.questions?.length > 0) {
                    responseContent += `\n\n**Questions :**\n\n${data.exercise.questions.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n\n")}`;
                }
                if (data.exercise.warning) responseContent += `\n\n⚠️ ${data.exercise.warning}`;
                setMessages(prev => [...prev, { id: (Date.now() + 2).toString(), role: "assistant", content: responseContent, timestamp: new Date() }]);
            } else {
                throw new Error(data.error || "Erreur extraction");
            }
        } catch (error) {
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "❌ Impossible d'analyser l'image. Vérifiez que l'exercice est bien visible.", timestamp: new Date() }]);
        } finally {
            setUploadingImage(false);
        }
    };

    const removeExercise = (exoId: string) => {
        const updatedExercises = activeExercises.filter(ex => ex.id !== exoId);
        setActiveExercises(updatedExercises);
        onExercisesChange?.(updatedExercises);
    };

    const askAI = async () => {
        if (!question.trim()) return;
        const userId = auth.currentUser?.uid;
        if (!userId) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", content: "❌ Connexion requise", timestamp: new Date() }]);
            return;
        }
        const userMessage: Message = { id: Date.now().toString(), role: "user", content: question.trim(), timestamp: new Date() };
        setMessages(prev => [...prev, userMessage]);
        setQuestion("");
        setLoading(true);
        try {
            const params = new URLSearchParams({
                user_id: userId, question: userMessage.content,
                user_level: userLevel, user_subject: userSubject,
            });
            if (exoContext) {
                params.append("exo_id", exoContext.id);
                params.append("exo_title", exoContext.title);
                if (exoContext.statement) params.append("exo_statement", exoContext.statement);
                if (exoContext.solution) params.append("exo_solution", exoContext.solution);
                if (exoContext.difficulty) params.append("exo_difficulty", exoContext.difficulty);
                if (exoContext.tags?.length) params.append("exo_tags", exoContext.tags.join(", "));
            }
            if (messages.length > 0) {
                const history = messages.filter(m => !m.imagePreview).slice(-4)
                    .map(m => `${m.role === "user" ? "Élève" : "Assistant"}: ${m.content}`).join("\n");
                params.append("conversation_history", history);
            }
            if (activeExercises.length > 0) {
                const exercisesList = activeExercises.map(ex => ({
                    id: ex.id, title: ex.title, order: ex.order || 0,
                    statement: ex.statement || "", solution: ex.solution || "",
                    difficulty: ex.difficulty || "", tags: ex.tags?.join(", ") || "",
                    level: ex.level || "", subject: ex.subject || "", source: ex.source || "platform",
                }));
                params.append("active_exercises", JSON.stringify(exercisesList));
            }
            const apiUrl = buildApiUrl(apiConfig.endpoints.assistant.exo, Object.fromEntries(params));
            const res = await fetch(apiUrl);
            if (res.status === 429) {
                const errorData = await res.json();
                const now = new Date();
                const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
                const hoursUntilReset = Math.floor((midnight.getTime() - now.getTime()) / (1000 * 60 * 60));
                const minutesUntilReset = Math.floor(((midnight.getTime() - now.getTime()) % (1000 * 60 * 60)) / (1000 * 60));
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(), role: "assistant",
                    content: `🚫 Limite quotidienne atteinte !\n\nVous avez utilisé vos ${errorData.quota?.used || 0} questions disponibles aujourd'hui.\n\n⏰ Réinitialisation dans ${hoursUntilReset}h${minutesUntilReset.toString().padStart(2, "0")}\n\n${errorData.quota?.plan === "gratuit" ? "🎯 Passez au plan Élève pour 150 questions/jour !" : ""}`,
                    timestamp: new Date(),
                }]);
                setLoading(false);
                textareaRef.current?.focus();
                return;
            }
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: data.response || data.error || "Erreur lors de la réponse", timestamp: new Date() }]);
        } catch (error) {
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "❌ Erreur lors de la requête à l'assistant.\n\nVeuillez réessayer dans quelques instants.", timestamp: new Date() }]);
        } finally {
            setLoading(false);
            textareaRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askAI(); }
    };

    return (
        <div ref={dropZoneRef} className="h-full flex flex-col bg-white relative">

            {/* Overlay drag & drop */}
            {isDragging && (
                <div className="absolute inset-0 bg-teal-500/10 border-4 border-dashed border-teal-500 z-50 flex items-center justify-center">
                    <div className="text-center bg-white p-6 rounded-xl shadow-lg">
                        <Upload size={48} className="text-teal-600 mx-auto mb-2" />
                        <p className="text-lg font-semibold text-teal-700">Dépose ton image ici</p>
                    </div>
                </div>
            )}

            {/* ── Header sobre ── */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-teal-700 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold">IA</span>
                        </div>
                        <h2 className="text-sm font-semibold text-gray-800">Assistant IA</h2>
                        <button onClick={onClose} className="ml-auto p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-gray-600">
                            <X size={16} />
                        </button>
                    </div>

                    {/* Exercices actifs */}
                    {activeExercises.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap mt-2">
                            {activeExercises.slice(0, 3).map(ex => (
                                <div key={ex.id} className="flex items-center gap-1 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full text-xs">
                                    <span className="text-teal-600">
                                        {ex.source === "pdf" ? "📄" : ex.source === "photo" ? "📷" : `#${ex.order}`}
                                    </span>
                                    <span className="text-teal-800 truncate max-w-[100px] font-medium">{ex.title}</span>
                                    {(ex.source === "photo" || ex.source === "pdf") && (
                                        <button onClick={() => removeExercise(ex.id)} className="text-teal-400 hover:text-red-500 transition ml-0.5">
                                            <FaTimes size={9} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {activeExercises.length > 3 && (
                                <span className="text-xs text-gray-400">+{activeExercises.length - 3}</span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Zone messages ── */}
            <div className="flex-1 overflow-y-auto p-4">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-6">
                        <div className="w-14 h-14 rounded-2xl bg-teal-700 flex items-center justify-center mb-4 shadow-md">
                            <span className="text-white text-xl font-bold">IA</span>
                        </div>
                        <h3 className="text-base font-semibold text-gray-800 mb-1">Assistant IA</h3>
                        <p className="text-sm text-gray-500 mb-6">Pose ta question ou envoie une image de ton exercice</p>
                        <div className="w-full max-w-xs space-y-2 text-left">
                            <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                                <Paperclip size={13} className="text-gray-400 flex-shrink-0" />
                                <span>Clique sur 📎 pour envoyer une image</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                                <Upload size={13} className="text-gray-400 flex-shrink-0" />
                                <span>Glisse-dépose ou colle (Ctrl+V)</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === "user"
                                    ? "bg-teal-700 text-white"
                                    : "bg-gray-100 text-gray-800"
                                    }`}>
                                    {msg.role === "assistant" && (
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <div className="w-4 h-4 rounded-full bg-teal-700 flex items-center justify-center">
                                                <span className="text-white text-[8px] font-bold">IA</span>
                                            </div>
                                            <span className="text-xs font-semibold text-teal-700">Assistant</span>
                                        </div>
                                    )}
                                    {msg.imagePreview && (
                                        <div className="mb-2">
                                            <img src={msg.imagePreview} alt="Capture" className="max-w-full rounded-lg border-2 border-white/30 shadow-md" style={{ maxHeight: "300px" }} />
                                        </div>
                                    )}
                                    {msg.content && <div className="leading-relaxed">{renderMessageContent(msg.content)}</div>}
                                    <span className="text-xs opacity-50 mt-1.5 block">
                                        {msg.timestamp.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {(loading || uploadingImage) && (
                            <div className="flex justify-start">
                                <div className="bg-gray-100 rounded-2xl px-4 py-3">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" />
                                        <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                                        <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
                                        <span className="text-xs text-gray-500 ml-1.5">{uploadingImage ? "Analyse..." : "Réflexion..."}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* ── Zone de saisie — style ChatGPT ── */}
            <div className="px-3 pb-3 pt-2 border-t">
                <input ref={fileInputGalleryRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const file = e.target.files?.[0]; if (file) { handleImageUpload(file); setShowAttachMenu(false); } e.target.value = ""; }}
                />
                <input ref={fileInputCameraRef} type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={(e) => { const file = e.target.files?.[0]; if (file) { handleImageUpload(file); setShowAttachMenu(false); } e.target.value = ""; }}
                />

                <div className="flex items-end gap-2 bg-gray-100 rounded-2xl px-3 py-2.5">

                    {/* Bouton 📎 avec menu popup */}
                    <div className="relative flex-shrink-0" ref={attachMenuRef}>
                        <button
                            onClick={() => setShowAttachMenu(v => !v)}
                            disabled={loading || uploadingImage}
                            className={`p-1.5 rounded-lg transition disabled:opacity-50 ${showAttachMenu
                                ? "bg-teal-700 text-white"
                                : "text-gray-500 hover:text-teal-700 hover:bg-gray-200"
                                }`}
                            title="Joindre une image"
                        >
                            <Paperclip size={18} />
                        </button>

                        {/* Menu popup — au-dessus */}
                        {showAttachMenu && (
                            <div className="absolute bottom-10 left-0 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 w-44 z-50 overflow-hidden">
                                <button
                                    onClick={() => fileInputGalleryRef.current?.click()}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition text-left"
                                >
                                    <ImagePlus size={15} className="text-teal-600 flex-shrink-0" />
                                    <span className="text-sm text-gray-700">Galerie photos</span>
                                </button>
                                <button
                                    onClick={() => fileInputCameraRef.current?.click()}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition text-left"
                                >
                                    <Camera size={15} className="text-teal-600 flex-shrink-0" />
                                    <span className="text-sm text-gray-700">Prendre une photo</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Textarea */}
                    <textarea
                        ref={textareaRef}
                        className="flex-1 bg-transparent resize-none focus:outline-none text-sm text-gray-800 placeholder-gray-400 max-h-32 py-0.5"
                        rows={1}
                        placeholder={activeExercises.length > 0 ? "Pose ta question sur les exercices..." : "Pose ta question..."}
                        value={question}
                        onChange={(e) => {
                            setQuestion(e.target.value);
                            e.target.style.height = "auto";
                            e.target.style.height = Math.min(e.target.scrollHeight, 128) + "px";
                        }}
                        onKeyDown={handleKeyDown}
                        disabled={loading || uploadingImage}
                    />

                    {/* Bouton envoyer */}
                    <button
                        onClick={askAI}
                        disabled={loading || uploadingImage || !question.trim()}
                        className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition ${question.trim() && !loading && !uploadingImage
                            ? "bg-teal-700 hover:bg-teal-800 text-white shadow-sm"
                            : "bg-gray-300 text-gray-400 cursor-not-allowed"
                            }`}
                    >
                        <Send size={15} />
                    </button>
                </div>

                <p className="text-[11px] text-gray-400 mt-1.5 text-center">
                    <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px]">Entrée</kbd> pour envoyer ·{" "}
                    <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px]">Ctrl+V</kbd> pour coller
                </p>
            </div>
        </div>
    );
}