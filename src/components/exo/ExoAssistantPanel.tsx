// src/components/exo/ExoAssistantPanel.tsx
"use client";
import { useState, useRef, useEffect } from "react";
import { X, Send, Camera, Upload } from "lucide-react";
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
    source?: "photo" | "platform";
}

interface ExoAssistantPanelProps {
    onClose: () => void;
    exoContext?: ExoContext;
    userLevel?: string;
    userSubject?: string;
    activeExercises?: ExoContext[];
    onExercisesChange?: (exercises: ExoContext[]) => void;
}

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    imagePreview?: string;
}

/**
 * Rendu du contenu avec LaTeX - IDENTIQUE à ExoCard
 * Utilise preprocessLatex + MathJax direct (pas de dangerouslySetInnerHTML)
 */
const renderMessageContent = (text: string) => {
    if (!text) return null;

    // ✅ Utiliser preprocessLatex comme ExoCard
    const processedText = preprocessLatex(text);

    const paragraphs = processedText
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

    return paragraphs.map((p, i) => {
        // Détection pour espacement (display math)
        const isDisplayBlock = p.startsWith("\\[") || p.startsWith("$$");

        return (
            <div
                key={i}
                className={`text-sm leading-relaxed ${isDisplayBlock ? "my-3 text-center" : "mb-2"}`}
            >
                <MathJax dynamic hideUntilTypeset="first">
                    {p}
                </MathJax>
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
    onExercisesChange
}: ExoAssistantPanelProps) {
    const [question, setQuestion] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeExercises, setActiveExercises] = useState<ExoContext[]>(initialActiveExercises);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setActiveExercises(initialActiveExercises);
    }, [initialActiveExercises]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Gestion du copier-coller d'images
    useEffect(() => {
        const handlePaste = async (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    e.preventDefault();
                    const blob = items[i].getAsFile();
                    if (blob) await handleImageUpload(blob);
                    break;
                }
            }
        };

        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [activeExercises]);

    // Gestion du drag & drop
    useEffect(() => {
        const dropZone = dropZoneRef.current;
        if (!dropZone) return;

        const handleDragOver = (e: DragEvent) => {
            e.preventDefault();
            setIsDragging(true);
        };

        const handleDragLeave = (e: DragEvent) => {
            e.preventDefault();
            if (e.target === dropZone) {
                setIsDragging(false);
            }
        };

        const handleDrop = async (e: DragEvent) => {
            e.preventDefault();
            setIsDragging(false);

            const files = e.dataTransfer?.files;
            if (files && files.length > 0) {
                const file = files[0];
                if (file.type.startsWith('image/')) {
                    await handleImageUpload(file);
                }
            }
        };

        dropZone.addEventListener('dragover', handleDragOver);
        dropZone.addEventListener('dragleave', handleDragLeave);
        dropZone.addEventListener('drop', handleDrop);

        return () => {
            dropZone.removeEventListener('dragover', handleDragOver);
            dropZone.removeEventListener('dragleave', handleDragLeave);
            dropZone.removeEventListener('drop', handleDrop);
        };
    }, [activeExercises]);

    const handleImageUpload = async (file: File) => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            const errorMessage: Message = {
                id: Date.now().toString(),
                role: "assistant",
                content: "❌ Vous devez être connecté",
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            const errorMessage: Message = {
                id: Date.now().toString(),
                role: "assistant",
                content: "❌ Image trop lourde (max 5MB)",
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
            return;
        }

        // Aperçu de l'image
        const reader = new FileReader();
        reader.onload = (e) => {
            const imagePreview = e.target?.result as string;
            const userMessage: Message = {
                id: Date.now().toString(),
                role: "user",
                content: "",
                timestamp: new Date(),
                imagePreview
            };
            setMessages(prev => [...prev, userMessage]);
        };
        reader.readAsDataURL(file);

        setUploadingImage(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const apiUrl = buildApiUrl(apiConfig.endpoints.assistant.extractExercise, { user_id: userId });
            const res = await fetch(apiUrl, { method: 'POST', body: formData });

            if (res.status === 429) {
                const errorData = await res.json();
                const now = new Date();
                const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
                const hoursUntilReset = Math.floor((midnight.getTime() - now.getTime()) / (1000 * 60 * 60));

                const quotaMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: "assistant",
                    content: `🚫 Limite atteinte (${errorData.quota?.used}/${errorData.quota?.limit})\n\n⏰ Réinitialisation dans ${hoursUntilReset}h`,
                    timestamp: new Date(),
                };

                setMessages(prev => [...prev, quotaMessage]);
                setUploadingImage(false);
                return;
            }

            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

            const data = await res.json();

            if (data.success && data.exercise) {
                const newExercise: ExoContext = {
                    id: data.exercise.id,
                    title: data.exercise.title,
                    statement: data.exercise.statement,
                    difficulty: data.exercise.difficulty,
                    tags: data.exercise.tags,
                    source: "photo"
                };

                const updatedExercises = [...activeExercises, newExercise];
                setActiveExercises(updatedExercises);
                onExercisesChange?.(updatedExercises);

                // ✅ Construire le contenu avec le statement LaTeX
                let responseContent = `✅ **${data.exercise.title}**\n\n${data.exercise.statement}`;

                if (data.exercise.questions && data.exercise.questions.length > 0) {
                    responseContent += `\n\n**Questions :**\n\n${data.exercise.questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n\n')}`;
                }

                if (data.exercise.warning) {
                    responseContent += `\n\n⚠️ ${data.exercise.warning}`;
                }

                const assistantMessage: Message = {
                    id: (Date.now() + 2).toString(),
                    role: "assistant",
                    content: responseContent,
                    timestamp: new Date(),
                };

                setMessages(prev => [...prev, assistantMessage]);
            } else {
                throw new Error(data.error || "Erreur extraction");
            }

        } catch (error) {
            console.error("Erreur upload:", error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: "❌ Impossible d'analyser l'image. Vérifiez que l'exercice est bien visible.",
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setUploadingImage(false);
        }
    };

    const removePhotoExercise = (exoId: string) => {
        const updatedExercises = activeExercises.filter(ex => ex.id !== exoId);
        setActiveExercises(updatedExercises);
        onExercisesChange?.(updatedExercises);
    };

    const askAI = async () => {
        if (!question.trim()) return;

        const userId = auth.currentUser?.uid;
        if (!userId) {
            const errorMessage: Message = {
                id: Date.now().toString(),
                role: "assistant",
                content: "❌ Connexion requise",
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
            return;
        }

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: question.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setQuestion("");
        setLoading(true);

        try {
            const params = new URLSearchParams({
                user_id: userId,
                question: userMessage.content,
                user_level: userLevel,
                user_subject: userSubject,
            });

            if (exoContext) {
                params.append("exo_id", exoContext.id);
                params.append("exo_title", exoContext.title);
                if (exoContext.statement) params.append("exo_statement", exoContext.statement);
                if (exoContext.solution) params.append("exo_solution", exoContext.solution);
                if (exoContext.difficulty) params.append("exo_difficulty", exoContext.difficulty);
                if (exoContext.tags && exoContext.tags.length > 0) params.append("exo_tags", exoContext.tags.join(", "));
            }

            if (messages.length > 0) {
                const history = messages.filter(m => !m.imagePreview).slice(-4).map(m => `${m.role === "user" ? "Élève" : "Assistant"}: ${m.content}`).join("\n");
                params.append("conversation_history", history);
            }

            if (activeExercises.length > 0) {
                const exercisesList = activeExercises.map(ex => ({
                    id: ex.id,
                    title: ex.title,
                    order: ex.order || 0,
                    statement: ex.statement || "",
                    solution: ex.solution || "",
                    difficulty: ex.difficulty || "",
                    tags: ex.tags?.join(", ") || "",
                    level: ex.level || "",
                    subject: ex.subject || "",
                    source: ex.source || "platform"
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

                const quotaMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: "assistant",
                    content: `🚫 Limite quotidienne atteinte !\n\nVous avez utilisé vos ${errorData.quota?.used || 0} questions disponibles aujourd'hui.\n\n⏰ Réinitialisation dans ${hoursUntilReset}h${minutesUntilReset.toString().padStart(2, '0')} (minuit UTC)\n\n💡 En attendant :\n• Revenez demain pour poser plus de questions\n• Consultez les corrections disponibles\n• Relisez vos cours\n\n${errorData.quota?.plan === "gratuit" ? "🎯 Passez au plan Élève pour 150 questions/jour !" : ""}`,
                    timestamp: new Date(),
                };

                setMessages(prev => [...prev, quotaMessage]);
                setLoading(false);
                textareaRef.current?.focus();
                return;
            }

            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

            const data = await res.json();

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: data.response || data.error || "Erreur lors de la réponse",
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error("Erreur:", error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: "❌ Erreur lors de la requête à l'assistant.\n\nVeuillez réessayer dans quelques instants.",
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
            textareaRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            askAI();
        }
    };

    return (
        <div ref={dropZoneRef} className="h-full flex flex-col bg-white relative">
            {/* Overlay drag & drop */}
            {isDragging && (
                <div className="absolute inset-0 bg-green-500/10 border-4 border-dashed border-green-500 z-50 flex items-center justify-center">
                    <div className="text-center bg-white p-6 rounded-xl shadow-lg">
                        <Upload size={48} className="text-green-600 mx-auto mb-2" />
                        <p className="text-lg font-semibold text-green-700">Dépose ton image</p>
                    </div>
                </div>
            )}

            {/* Header compact */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-green-50 to-green-100">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-base font-semibold text-green-900">Assistant IA</h2>
                        <button onClick={onClose} className="ml-auto p-1.5 hover:bg-green-200 rounded transition">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Exercices actifs */}
                    {activeExercises.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                            {activeExercises.slice(0, 3).map((ex) => (
                                <div key={ex.id} className="flex items-center gap-1 bg-white px-2 py-1 rounded-full border border-green-200">
                                    {ex.source === "photo" ? (
                                        <>
                                            <span className="text-blue-600">📷</span>
                                            <span className="text-gray-700 truncate max-w-[100px]">{ex.title}</span>
                                            <button onClick={() => removePhotoExercise(ex.id)} className="text-red-500 hover:text-red-700">
                                                <FaTimes size={10} />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-green-600 font-semibold">{ex.order}</span>
                                            <span className="text-gray-700 truncate max-w-[120px]">{ex.title}</span>
                                        </>
                                    )}
                                </div>
                            ))}
                            {activeExercises.length > 3 && (
                                <span className="text-gray-500">+{activeExercises.length - 3}</span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Zone messages */}
            <div className="flex-1 overflow-y-auto p-4">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4">
                        <div className="max-w-md">
                            <div className="mb-6">
                                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                                    <Upload size={36} className="text-white" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                    Pose ta question ou envoie une image
                                </h3>
                                <p className="text-sm text-gray-600">
                                    Prends en photo ton exercice ou tape ta question
                                </p>
                            </div>

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-4 px-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-medium shadow-lg transition-all duration-200 flex items-center justify-center gap-3"
                            >
                                <Camera size={24} />
                                <span>Envoyer une image</span>
                            </button>

                            <div className="mt-6 text-xs text-gray-500 space-y-1">
                                <p>💡 Tu peux aussi :</p>
                                <p>• Glisser-déposer une image</p>
                                <p>• Coller une image (Ctrl+V)</p>
                                <p>• Sélectionner des exercices avec 🤖</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === "user" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-800"}`}>
                                    {msg.role === "assistant" && (
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-semibold text-green-700">🤖 Assistant</span>
                                        </div>
                                    )}

                                    {/* Aperçu image */}
                                    {msg.imagePreview && (
                                        <div className="mb-2">
                                            <img
                                                src={msg.imagePreview}
                                                alt="Image"
                                                className="max-w-full rounded-lg border-2 border-white shadow-md"
                                                style={{ maxHeight: '300px' }}
                                            />
                                        </div>
                                    )}

                                    {/* ✅ Contenu avec LaTeX - utilise renderMessageContent */}
                                    {msg.content && (
                                        <div className="leading-relaxed">
                                            {renderMessageContent(msg.content)}
                                        </div>
                                    )}

                                    <span className="text-xs opacity-70 mt-2 block">
                                        {msg.timestamp.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {/* Loading */}
                        {(loading || uploadingImage) && (
                            <div className="flex justify-start">
                                <div className="bg-gray-100 border border-gray-200 rounded-2xl px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                                        <span className="text-xs text-gray-600 ml-2">
                                            {uploadingImage ? "Analyse de l'image..." : "Réflexion..."}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Zone de saisie */}
            <div className="border-t bg-white p-4">
                <div className="flex items-end gap-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file);
                            e.target.value = "";
                        }}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading || uploadingImage}
                        className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 shadow-md"
                        title="Envoyer une image"
                    >
                        <Camera size={20} />
                    </button>
                    <textarea
                        ref={textareaRef}
                        className="flex-1 border-2 border-gray-200 focus:border-green-500 p-3 rounded-xl resize-none focus:outline-none transition"
                        rows={1}
                        placeholder={activeExercises.length > 0 ? "Pose ta question sur les exercices..." : "Pose ta question ou envoie une image..."}
                        value={question}
                        onChange={(e) => {
                            setQuestion(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                        }}
                        onKeyDown={handleKeyDown}
                        disabled={loading || uploadingImage}
                    />
                    <button
                        onClick={askAI}
                        disabled={loading || uploadingImage || !question.trim()}
                        className="p-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition flex-shrink-0 shadow-md"
                    >
                        <Send size={20} />
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                    <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">Entrée</kbd> pour envoyer • <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">Ctrl+V</kbd> pour coller une image
                </p>
            </div>
        </div>
    );
}