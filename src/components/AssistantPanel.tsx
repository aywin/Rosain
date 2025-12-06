"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { X, Send, GripVertical } from "lucide-react";
import { MathJax } from "better-react-mathjax";
import { preprocessLatex, needsDisplay } from "@/components/admin/utils/latexUtils";
import { apiConfig } from "@/config/api";

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

const renderMessageContent = (text: string) => {
  if (!text) return null;
  const processedText = preprocessLatex(text);
  const paragraphs = processedText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return paragraphs.map((p, i) => {
    if (/^[•\-\*]\s/.test(p) || p.includes('\n•') || p.includes('\n-')) {
      const items = p.split('\n').filter(line => line.trim());
      return (
        <ul key={i} className="list-disc list-inside mb-3 space-y-1">
          {items.map((item, idx) => (
            <li key={idx} className="text-sm leading-relaxed">
              <MathJax dynamic inline hideUntilTypeset="first">
                {item.replace(/^[•\-\*]\s*/, '').trim()}
              </MathJax>
            </li>
          ))}
        </ul>
      );
    }

    if (/^\d+[\.\)]\s/.test(p)) {
      const items = p.split('\n').filter(line => line.trim());
      return (
        <ol key={i} className="list-decimal list-inside mb-3 space-y-1">
          {items.map((item, idx) => (
            <li key={idx} className="text-sm leading-relaxed">
              <MathJax dynamic inline hideUntilTypeset="first">
                {item.replace(/^\d+[\.\)]\s*/, '').trim()}
              </MathJax>
            </li>
          ))}
        </ol>
      );
    }

    const isDisplayBlock = p.startsWith("\\[") || p.startsWith("$$");
    return (
      <div key={i} className={`text-sm leading-relaxed ${isDisplayBlock ? "my-4 text-center" : "mb-3"}`}>
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isResizing = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const startResize = (e: React.MouseEvent) => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

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
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

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
      // ✅ Utilisation de la config centralisée
      const apiUrl = `${apiConfig.baseUrl}${apiConfig.endpoints.assistant.chat}`;

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userMessage.content,
          grade: courseContext?.courseLevel || "5e",
          subject: "Math",
          course_title: courseContext?.courseTitle,
          course_level: courseContext?.courseLevel,
          video_title: courseContext?.currentVideoTitle,
          video_url: courseContext?.currentVideoUrl,
          current_time: courseContext?.currentTime,
          transcript: courseContext?.transcript || [],
        }),
      });

      const data = await res.json();
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || data.error || "Erreur",
        timestamp: new Date(),
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "❌ Erreur de connexion",
        timestamp: new Date(),
      }]);
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
    <div
      className="h-full flex bg-white relative"
      style={{ width: panelWidth }}
    >
      {/* Poignée de redimensionnement à gauche */}
      <div
        onMouseDown={startResize}
        className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-200 active:bg-blue-300 transition-colors flex items-center justify-center group"
        title="Glisser pour redimensionner"
      >
        <div className="w-1 h-16 bg-gray-300 rounded group-hover:bg-blue-400 transition-colors" />
      </div>

      <div className="flex-1 flex flex-col ml-2">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-blue-50">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-blue-900">💬 Assistant IA</h2>
            {courseContext && (
              <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                <p className="font-medium truncate">{courseContext.courseTitle}</p>
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
            className="p-1 hover:bg-blue-100 rounded transition ml-2 flex-shrink-0"
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
        <div className="border-t p-4 bg-gray-50">
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              className="flex-1 border border-gray-300 p-3 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}