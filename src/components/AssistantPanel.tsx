// src/components/AssistantPanel.tsx
"use client";
import { useState, useRef, useEffect } from "react";
import { X, Send } from "lucide-react";
import { MathJax } from "better-react-mathjax";
import { preprocessLatex } from "@/components/admin/utils/latexUtils";
import { apiConfig } from "@/config/api";
import { auth } from "@/firebase";

interface TranscriptSegment {
  start: number;
  duration: number;
  text: string;
}

interface CourseContext {
  courseTitle: string;
  courseLevel: string;
  subject?: string;
  currentVideoTitle: string;
  currentVideoUrl: string;
  currentTime?: number;
  transcript?: TranscriptSegment[];
}

interface AssistantPanelProps {
  onClose: () => void;
  courseContext?: CourseContext;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const renderMessageContent = (text: string) => {
  if (!text) return null;
  const processedText = preprocessLatex(text);
  const paragraphs = processedText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return paragraphs.map((p, i) => {
    if (/^[•\-\*]\s/.test(p) || p.includes("\n•") || p.includes("\n-")) {
      const items = p.split("\n").filter((line) => line.trim());
      return (
        <ul key={i} className="list-disc list-inside mb-3 space-y-1">
          {items.map((item, idx) => (
            <li key={idx} className="text-sm leading-relaxed">
              <MathJax dynamic inline hideUntilTypeset="first">
                {item.replace(/^[•\-\*]\s*/, "").trim()}
              </MathJax>
            </li>
          ))}
        </ul>
      );
    }

    if (/^\d+[\.\)]\s/.test(p)) {
      const items = p.split("\n").filter((line) => line.trim());
      return (
        <ol key={i} className="list-decimal list-inside mb-3 space-y-1">
          {items.map((item, idx) => (
            <li key={idx} className="text-sm leading-relaxed">
              <MathJax dynamic inline hideUntilTypeset="first">
                {item.replace(/^\d+[\.\)]\s*/, "").trim()}
              </MathJax>
            </li>
          ))}
        </ol>
      );
    }

    const isDisplayBlock = p.startsWith("\\[") || p.startsWith("$$");
    return (
      <div
        key={i}
        className={`text-sm leading-relaxed ${isDisplayBlock ? "my-4 text-center" : "mb-3"}`}
      >
        <MathJax dynamic hideUntilTypeset="first">{p}</MathJax>
      </div>
    );
  });
};

export default function AssistantPanel({ onClose, courseContext }: AssistantPanelProps) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [panelWidth, setPanelWidth] = useState(400);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isResizing = useRef(false);

  // Détecter mobile côté client uniquement
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const startResize = (e: React.MouseEvent) => {
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const startX = e.clientX;
    const startWidth = panelWidth;

    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = startX - e.clientX;
      const newWidth = Math.min(800, Math.max(300, startWidth + delta));
      setPanelWidth(newWidth);
    };

    const onMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  const askAI = async () => {
    if (!question.trim()) return;

    const userId = auth.currentUser?.uid;
    if (!userId) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "❌ Vous devez être connecté pour utiliser l'assistant.",
          timestamp: new Date(),
        },
      ]);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: question.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setLoading(true);

    try {
      const apiUrl = `${apiConfig.baseUrl}${apiConfig.endpoints.assistant.chat}`;

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          question: userMessage.content,
          grade: courseContext?.courseLevel || "5e",
          subject: courseContext?.subject || "Math",
          course_title: courseContext?.courseTitle,
          course_level: courseContext?.courseLevel,
          video_title: courseContext?.currentVideoTitle,
          video_url: courseContext?.currentVideoUrl,
          current_time: courseContext?.currentTime,
          transcript: courseContext?.transcript || [],
        }),
      });

      if (res.status === 429) {
        const errorData = await res.json();
        const now = new Date();
        const midnight = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0)
        );
        const hoursUntilReset = Math.floor(
          (midnight.getTime() - now.getTime()) / (1000 * 60 * 60)
        );
        const minutesUntilReset = Math.floor(
          ((midnight.getTime() - now.getTime()) % (1000 * 60 * 60)) / (1000 * 60)
        );

        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: `🚫 Limite quotidienne atteinte !\n\nVous avez utilisé vos ${errorData.quota?.used || 0} questions disponibles aujourd'hui.\n\n⏰ Réinitialisation dans ${hoursUntilReset}h${minutesUntilReset.toString().padStart(2, "0")} (minuit UTC)\n\n💡 En attendant :\n• Revenez demain pour poser plus de questions\n• Relisez la transcription disponible\n• Consultez vos notes de cours\n\n${errorData.quota?.plan === "gratuit" ? "🎯 Passez au plan Élève pour plus de questions/jour !" : ""}`,
            timestamp: new Date(),
          },
        ]);
        setLoading(false);
        textareaRef.current?.focus();
        return;
      }

      if (!res.ok) throw new Error(`Erreur API: ${res.status}`);

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response || "Désolé, je n'ai pas pu générer de réponse.",
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error("Erreur lors de l'appel API:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "❌ Une erreur s'est produite. Réessaye plus tard.",
          timestamp: new Date(),
        },
      ]);
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

  // Style du panel : plein écran sur mobile, largeur fixe sur desktop
  const panelStyle = isMobile
    ? { inset: 0 }
    : { top: 0, right: 0, height: "100vh", width: panelWidth };

  return (
    <>
      {/* Overlay mobile */}
      {isMobile && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div className="fixed z-50 bg-white shadow-2xl flex" style={panelStyle}>
        {/* Poignée de redimensionnement — desktop uniquement */}
        {!isMobile && (
          <div
            onMouseDown={startResize}
            className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-200 active:bg-blue-300 transition-colors flex items-center justify-center group"
            title="Glisser pour redimensionner"
          >
            <div className="w-1 h-16 bg-gray-300 rounded group-hover:bg-blue-400 transition-colors" />
          </div>
        )}

        <div className="flex flex-col flex-1 ml-0 md:ml-2 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-blue-50 flex-shrink-0">
            <div className="flex-1 min-w-0">
              <h2 className="text-base md:text-lg font-semibold text-blue-900">
                💬 Assistant IA
              </h2>
              {courseContext && (
                <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                  <p className="font-medium truncate">{courseContext.courseTitle}</p>
                  {courseContext.subject && (
                    <p className="text-blue-700 font-medium">{courseContext.subject}</p>
                  )}
                  <p className="truncate">{courseContext.currentVideoTitle}</p>
                  {courseContext.transcript && courseContext.transcript.length > 0 && (
                    <p className="text-green-600 flex items-center gap-1">
                      <span>✓</span> Transcription ({courseContext.transcript.length} segments)
                    </p>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-blue-100 rounded transition ml-2 flex-shrink-0"
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
                  <li>Explique-moi ce qui est dit de 4:00 à 5:00</li>
                  <li>Peux-tu reformuler ce que le prof vient de dire ?</li>
                  <li>Comment résoudre ce type d'exercice ?</li>
                </ul>
                {courseContext?.transcript && courseContext.transcript.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs">
                    <p className="font-semibold mb-1">🎯 Astuce :</p>
                    <p>Tu peux me demander d'expliquer un passage précis en mentionnant les minutes.</p>
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
                    className={`max-w-[90%] rounded-lg px-4 py-2 ${msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-800 border border-gray-200"
                      }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-blue-900">🤖 Assistant</span>
                      </div>
                    )}
                    <div className="leading-relaxed">
                      {msg.role === "assistant"
                        ? renderMessageContent(msg.content)
                        : <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                      }
                    </div>
                    <span className="text-xs opacity-70 mt-2 block">
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
          <div className="border-t p-3 md:p-4 bg-gray-50 flex-shrink-0">
            <div className="flex gap-2">
              <textarea
                ref={textareaRef}
                className="flex-1 border border-gray-300 p-2.5 md:p-3 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                rows={2}
                placeholder="Pose ta question..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <button
                onClick={askAI}
                disabled={loading || !question.trim()}
                className="px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition self-end"
              >
                <Send size={18} />
              </button>
            </div>
            {isMobile && (
              <p className="text-center text-[10px] text-gray-400 mt-2">
                Touchez en dehors pour fermer
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}