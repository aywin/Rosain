"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { X, Send } from "lucide-react";

interface TranscriptSegment {
  start: number;
  duration: number;
  text: string;
}

interface CourseContext {
  courseTitle: string;
  courseLevel: string;
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

export default function AssistantPanel({ onClose, courseContext }: AssistantPanelProps) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll vers le bas quand un nouveau message arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus sur le textarea au chargement
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Extraire le segment de transcription actuel (±30 secondes)
  const currentTranscriptSegment = useMemo(() => {
    if (!courseContext?.transcript || !courseContext?.currentTime) return null;

    const currentTime = courseContext.currentTime;
    const segments = courseContext.transcript.filter(seg =>
      seg.start >= currentTime - 30 && seg.start <= currentTime + 30
    );

    if (segments.length === 0) return null;

    return segments.map(seg => seg.text).join(" ");
  }, [courseContext?.transcript, courseContext?.currentTime]);

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
        grade: courseContext?.courseLevel || "5e",
        subject: "Math",
        question: userMessage.content,
      });

      if (courseContext?.courseTitle) {
        params.append("course_title", courseContext.courseTitle);
      }
      if (courseContext?.courseLevel) {
        params.append("course_level", courseContext.courseLevel);
      }
      if (courseContext?.currentVideoTitle) {
        params.append("video_title", courseContext.currentVideoTitle);
      }
      if (courseContext?.currentVideoUrl) {
        params.append("video_url", courseContext.currentVideoUrl);
      }
      if (currentTranscriptSegment) {
        params.append("transcript_context", currentTranscriptSegment);
      }

      const res = await fetch(
        `http://127.0.0.1:8000/ai_assistant_text?${params.toString()}`
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
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-blue-50">
        <div>
          <h2 className="text-lg font-semibold text-blue-900">💬 Assistant IA</h2>
          {courseContext && (
            <div className="text-xs text-gray-600 mt-1 space-y-0.5">
              <p className="font-medium">{courseContext.courseTitle}</p>
              <p>{courseContext.currentVideoTitle}</p>
              {currentTranscriptSegment && (
                <p className="text-green-600 flex items-center gap-1">
                  <span>✓</span> Contexte vidéo chargé
                </p>
              )}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-blue-100 rounded transition"
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
              <li>Peux-tu m'expliquer ce que le prof vient de dire ?</li>
              <li>Comment résoudre ce type d'exercice ?</li>
              <li>Quelles sont les étapes à suivre ?</li>
              {currentTranscriptSegment && (
                <li className="text-green-600">
                  L'IA a accès à ce que dit la vidéo en ce moment !
                </li>
              )}
            </ul>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-4 py-2 ${msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-800 border border-gray-200"
                  }`}
              >
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-blue-900">🤖 Assistant</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap leading-relaxed text-sm">
                  {msg.content}
                </p>
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
            className="flex-1 border border-gray-300 p-3 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Appuyez sur <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">Entrée</kbd> pour envoyer, <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">Shift+Entrée</kbd> pour une nouvelle ligne
        </p>
      </div>
    </div>
  );
}