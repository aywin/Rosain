"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { X, Send, BookOpen } from "lucide-react";
import { FaRobot } from "react-icons/fa";
import { MathJax, MathJaxContext } from "better-react-mathjax";
import { mathJaxConfig } from "@/components/admin/utils/mathjaxConfig";

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
}

interface ExoAssistantPanelProps {
    onClose: () => void;
    exoContext?: ExoContext;
    userLevel?: string;
    userSubject?: string;
    activeExercises?: ExoContext[];
}

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

// Helper pour détecter si on a besoin du mode display
const needsDisplay = (text: string) => {
    return /\\(sys|align|cases|begin\{.*matrix\})/.test(text);
};

// Helper pour parser le Markdown simple (gras, italique, listes)
const parseMarkdown = (text: string) => {
    // Gras : **texte** ou __texte__
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italique : *texte* ou _texte_ (mais pas dans les formules LaTeX)
    text = text.replace(/(?<![\\$])\*([^*\n]+?)\*(?![*$])/g, '<em>$1</em>');
    text = text.replace(/(?<![\\$])_([^_\n]+?)_(?![_$])/g, '<em>$1</em>');

    // Code inline : `code`
    text = text.replace(/`(.+?)`/g, '<code class="bg-gray-200 px-1 rounded text-xs">$1</code>');

    return text;
};

// Helper pour rendre les paragraphes avec MathJax + Markdown
const renderMessageContent = (content: string) => {
    // Séparer par lignes doubles pour les paragraphes
    const paragraphs = content
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

    return paragraphs.map((p, i) => {
        // Détecter les listes
        const isList = /^[-•*]\s/.test(p);

        if (isList) {
            const items = p.split('\n').filter(line => line.trim());
            return (
                <ul key={i} className="list-disc list-inside mb-2 space-y-1">
                    {items.map((item, idx) => {
                        const cleanItem = item.replace(/^[-•*]\s/, '');
                        const parsedItem = parseMarkdown(cleanItem);
                        return (
                            <li key={idx} className="text-sm">
                                <MathJax dynamic inline>
                                    <span dangerouslySetInnerHTML={{ __html: parsedItem }} />
                                </MathJax>
                            </li>
                        );
                    })}
                </ul>
            );
        }

        // Paragraphe normal avec Markdown + LaTeX
        const parsedParagraph = parseMarkdown(p);

        return (
            <p key={i} className="mb-2 last:mb-0">
                <MathJax dynamic inline>
                    <span dangerouslySetInnerHTML={{ __html: parsedParagraph }} />
                </MathJax>
            </p>
        );
    });
};

export default function ExoAssistantPanel({
    onClose,
    exoContext,
    userLevel = "Terminal",
    userSubject = "Maths",
    activeExercises = []
}: ExoAssistantPanelProps) {
    const [question, setQuestion] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    const askAI = async () => {
        if (!question.trim()) return;

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
                question: userMessage.content,
                user_level: userLevel,
                user_subject: userSubject,
            });

            // Ajouter le contexte de l'exercice si disponible
            if (exoContext) {
                params.append("exo_id", exoContext.id);
                params.append("exo_title", exoContext.title);

                if (exoContext.statement) {
                    params.append("exo_statement", exoContext.statement);
                }
                if (exoContext.solution) {
                    params.append("exo_solution", exoContext.solution);
                }
                if (exoContext.difficulty) {
                    params.append("exo_difficulty", exoContext.difficulty);
                }
                if (exoContext.tags && exoContext.tags.length > 0) {
                    params.append("exo_tags", exoContext.tags.join(", "));
                }
            }

            // Ajouter l'historique de conversation (simplifié)
            if (messages.length > 0) {
                const history = messages.slice(-4).map(m =>
                    `${m.role === "user" ? "Élève" : "Assistant"}: ${m.content}`
                ).join("\n");
                params.append("conversation_history", history);
            }

            // ✅ CORRIGÉ : Ajouter TOUS les champs des exercices actifs
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
                    subject: ex.subject || ""
                }));
                params.append("active_exercises", JSON.stringify(exercisesList));
            }

            const res = await fetch(
                `http://127.0.0.1:8000/ai_assistant_exo?${params.toString()}`
            );

            const data = await res.json();

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: data.response || data.error || "Erreur lors de la réponse",
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: "❌ Erreur lors de la requête à l'assistant.",
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
        <MathJaxContext config={mathJaxConfig}>
            <div className="h-full flex flex-col bg-white">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-green-50 to-green-100">
                    <div className="flex-1">
                        <h2 className="text-lg font-semibold text-green-900 flex items-center gap-2">
                            <BookOpen size={20} />
                            Assistant Exercices
                        </h2>

                        {activeExercises.length === 0 ? (
                            <div className="text-xs text-gray-600 mt-1">
                                <p className="font-medium text-orange-600">
                                    💡 Mode général - Questions sur le cours
                                </p>
                                <p className="text-gray-500 mt-1">
                                    Coche des exercices (🤖) pour une aide personnalisée
                                </p>
                            </div>
                        ) : activeExercises.length === 1 ? (
                            <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                                <p className="font-medium text-green-700">
                                    📝 Exercice {activeExercises[0].order}: {activeExercises[0].title}
                                </p>
                                {activeExercises[0].difficulty && (
                                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${activeExercises[0].difficulty === "facile" ? "bg-green-100 text-green-700" :
                                        activeExercises[0].difficulty === "moyen" ? "bg-yellow-100 text-yellow-700" :
                                            "bg-red-100 text-red-700"
                                        }`}>
                                        {activeExercises[0].difficulty.charAt(0).toUpperCase() + activeExercises[0].difficulty.slice(1)}
                                    </span>
                                )}
                                <p className="text-green-600 flex items-center gap-1 text-xs">
                                    <span>✓</span> J'ai accès à l'énoncé complet
                                </p>
                            </div>
                        ) : (
                            <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                                <p className="font-medium text-green-700">
                                    📚 {activeExercises.length} exercices sélectionnés
                                </p>
                                <div className="max-h-28 overflow-y-auto space-y-1 mt-1 bg-white p-2 rounded border">
                                    {activeExercises.map((ex) => (
                                        <div
                                            key={ex.id}
                                            className="flex items-start gap-2 text-xs text-gray-700"
                                        >
                                            <span className="font-bold text-green-600 flex-shrink-0">Exo {ex.order}:</span>
                                            <span className="flex-1 leading-tight">{ex.title}</span>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-green-600 flex items-center gap-1 text-xs mt-1">
                                    <span>✓</span> J'ai accès à tous ces énoncés complets
                                </p>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-green-200 rounded transition"
                        aria-label="Fermer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Zone de messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                        <div className="text-sm text-gray-500 space-y-2 mt-4">
                            <p className="font-medium">💡 Exemples de questions :</p>
                            <ul className="list-disc list-inside space-y-1 text-gray-600">
                                {activeExercises.length === 0 ? (
                                    <>
                                        <li>C'est quoi le théorème de Pythagore ?</li>
                                        <li>Comment résoudre une équation du 2nd degré ?</li>
                                        <li>Peux-tu m'expliquer les barycentres ?</li>
                                        <li>Comment factoriser une expression ?</li>
                                    </>
                                ) : activeExercises.length === 1 ? (
                                    <>
                                        <li>Je ne sais pas par où commencer</li>
                                        <li>Peux-tu m'expliquer cette notion ?</li>
                                        <li>J'ai trouvé x=5, est-ce correct ?</li>
                                        <li>Quelle formule dois-je utiliser ?</li>
                                    </>
                                ) : (
                                    <>
                                        <li>Je ne comprends pas l'exercice {activeExercises[0]?.order}</li>
                                        <li>Ces exercices sont similaires ?</li>
                                        <li>Par lequel je devrais commencer ?</li>
                                        <li>Peux-tu comparer les méthodes ?</li>
                                    </>
                                )}
                            </ul>
                            {activeExercises.length > 0 ? (
                                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs">
                                    <p className="font-semibold mb-1">🎯 Conseil :</p>
                                    <p>Je suis là pour t'aider à comprendre et résoudre par toi-même.
                                        {activeExercises.length > 1 && " Tu peux me parler de n'importe quel exercice sélectionné !"}
                                        N'hésite pas à me dire où tu bloques exactement !</p>
                                </div>
                            ) : (
                                <div className="mt-4 p-3 bg-orange-50 rounded-lg text-xs">
                                    <p className="font-semibold mb-1 flex items-center gap-1">
                                        <FaRobot className="text-orange-600" />
                                        Astuce :
                                    </p>
                                    <p>Coche la case "🤖 Inclure dans l'assistant" sur les exercices pour que je puisse accéder à leurs énoncés et te donner une aide personnalisée !</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-lg px-4 py-2 ${msg.role === "user"
                                        ? "bg-green-600 text-white"
                                        : "bg-gray-100 text-gray-800 border border-gray-200"
                                        }`}
                                >
                                    {msg.role === "assistant" && (
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-semibold text-green-900">🤖 Assistant</span>
                                        </div>
                                    )}
                                    <div className="leading-relaxed text-sm">
                                        {renderMessageContent(msg.content)}
                                    </div>
                                    <span className="text-xs opacity-70 mt-1 block">
                                        {msg.timestamp.toLocaleTimeString("fr-FR", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Zone de saisie */}
                <div className="border-t p-4 bg-gray-50">
                    <div className="flex gap-2">
                        <textarea
                            ref={textareaRef}
                            className="flex-1 border border-gray-300 p-3 rounded-lg resize-none focus:ring-2 focus:ring-green-500 focus:outline-none"
                            rows={2}
                            placeholder={exoContext ? "Décris où tu bloques..." : "Pose ta question..."}
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={loading}
                        />
                        <button
                            onClick={askAI}
                            disabled={loading || !question.trim()}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center gap-2"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        Appuyez sur <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">Entrée</kbd> pour envoyer
                    </p>
                </div>
            </div>
        </MathJaxContext>
    );
}