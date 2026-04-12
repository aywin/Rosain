"use client";
import { useState, useRef, useEffect, useCallback, memo } from "react";
import { X, Send, Camera, Upload, ImagePlus, Paperclip, Trash2, Plus, ChevronLeft, Clock } from "lucide-react";
import { FaTimes } from "react-icons/fa";
import { MathJax } from "better-react-mathjax";
import { buildApiUrl, apiConfig } from "@/config/api";
import { auth, db } from "@/firebase";
import { preprocessLatex } from "@/components/admin/utils/latexUtils";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const INDEX_DOC_ID = (userId: string) => `${userId}_exo_index`;
const SESSION_DOC_ID = (userId: string, sessionId: string) => `${userId}_exo_${sessionId}`;
const MAX_MESSAGES = 50;
const MAX_SESSIONS = 20;

interface ExoContext {
    id: string; title: string; statement?: string; solution?: string;
    difficulty?: string; tags?: string[]; level?: string; subject?: string;
    order?: number; source?: "photo" | "platform" | "pdf";
}
interface ExoAssistantPanelProps {
    onClose: () => void; exoContext?: ExoContext; userLevel?: string;
    userSubject?: string; activeExercises?: ExoContext[];
    onExercisesChange?: (exercises: ExoContext[]) => void;
    onImageCapture?: (handler: (file: File) => void) => void;
}
interface Message {
    id: string; role: "user" | "assistant"; content: string;
    timestamp: Date; imagePreview?: string;
}
interface StoredMessage { id: string; role: "user" | "assistant"; content: string; timestamp: number; }
interface SessionMeta { id: string; title: string; createdAt: number; updatedAt: number; messageCount: number; }

const toStored = (msg: Message): StoredMessage => ({ id: msg.id, role: msg.role, content: msg.content, timestamp: msg.timestamp.getTime() });
const fromStored = (s: StoredMessage): Message => ({ id: s.id, role: s.role, content: s.content, timestamp: new Date(s.timestamp) });

const formatRelativeDate = (ms: number) => {
    const diff = Date.now() - ms;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `il y a ${minutes} min`;
    if (hours < 24) return `il y a ${hours}h`;
    if (days === 1) return "Hier";
    if (days < 7) return `il y a ${days} jours`;
    return new Date(ms).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

const renderMessageContent = (text: string) => {
    if (!text) return null;
    const processedText = preprocessLatex(text);
    return processedText.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length > 0).map((p, i) => {
        const isDisplayBlock = p.startsWith("\\[") || p.startsWith("$$");
        return <div key={i} className={`text-sm leading-relaxed ${isDisplayBlock ? "my-3 text-center" : "mb-2"}`}><MathJax dynamic hideUntilTypeset="first">{p}</MathJax></div>;
    });
};

const ExoAssistantPanel = memo(function ExoAssistantPanel({
    onClose, exoContext, userLevel = "Terminal", userSubject = "Maths",
    activeExercises: initialActiveExercises = [], onExercisesChange, onImageCapture
}: ExoAssistantPanelProps) {
    const [view, setView] = useState<"sessions" | "chat">("sessions");
    const [sessions, setSessions] = useState<SessionMeta[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [question, setQuestion] = useState("");
    const [loading, setLoading] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [activeExercises, setActiveExercises] = useState<ExoContext[]>(initialActiveExercises);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputGalleryRef = useRef<HTMLInputElement>(null);
    const fileInputCameraRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);
    const attachMenuRef = useRef<HTMLDivElement>(null);
    const isFirstMessageSave = useRef(true);

    // ── FIX A : initialActiveExercises est un nouveau tableau à chaque render ──
    // On utilise une ref pour détecter les vraies modifications (par JSON)
    // sans déclencher de boucle infinie.
    const prevExercisesRef = useRef<string>("");
    useEffect(() => {
        const serialized = JSON.stringify(initialActiveExercises);
        if (serialized !== prevExercisesRef.current) {
            prevExercisesRef.current = serialized;
            setActiveExercises(initialActiveExercises);
        }
    }, [initialActiveExercises]);

    // ── Charger l'index au montage ────────────────────────────────────────────
    useEffect(() => {
        const loadIndex = async () => {
            const userId = auth.currentUser?.uid;
            if (!userId) { setHistoryLoading(false); return; }
            try {
                const snap = await getDoc(doc(db, "chatHistory", INDEX_DOC_ID(userId)));
                if (snap.exists()) setSessions((snap.data().sessions || []).sort((a: SessionMeta, b: SessionMeta) => b.updatedAt - a.updatedAt));
            } catch (err) { console.error("Erreur chargement index:", err); }
            finally { setHistoryLoading(false); }
        };
        loadIndex();
    }, []);

    // ── Sauvegarder les messages ──────────────────────────────────────────────
    useEffect(() => {
        if (historyLoading || !currentSessionId || messages.length === 0) return;
        if (isFirstMessageSave.current) { isFirstMessageSave.current = false; return; }
        const save = async () => {
            const userId = auth.currentUser?.uid;
            if (!userId) return;
            const toSave = messages.filter(m => m.content).slice(-MAX_MESSAGES).map(toStored);
            try { await setDoc(doc(db, "chatHistory", SESSION_DOC_ID(userId, currentSessionId)), { messages: toSave, updatedAt: serverTimestamp() }, { merge: false }); }
            catch (err) { console.error("Erreur sauvegarde:", err); }
        };
        save();
    }, [messages, historyLoading, currentSessionId]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    useEffect(() => {
        const h = (e: MouseEvent) => { if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) setShowAttachMenu(false); };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    // ── Sessions ──────────────────────────────────────────────────────────────
    const createNewSession = () => {
        setCurrentSessionId(Date.now().toString());
        setMessages([]);
        isFirstMessageSave.current = true;
        setView("chat");
        setTimeout(() => textareaRef.current?.focus(), 100);
    };

    const openSession = async (sessionId: string) => {
        const userId = auth.currentUser?.uid;
        if (!userId) return;
        setHistoryLoading(true);
        try {
            const snap = await getDoc(doc(db, "chatHistory", SESSION_DOC_ID(userId, sessionId)));
            setMessages(snap.exists() ? (snap.data().messages || []).map(fromStored) : []);
            setCurrentSessionId(sessionId);
            isFirstMessageSave.current = true;
            setView("chat");
        } catch (err) { console.error("Erreur ouverture session:", err); }
        finally { setHistoryLoading(false); setTimeout(() => textareaRef.current?.focus(), 100); }
    };

    const updateIndex = async (sessionId: string, firstUserMessage: string, msgCount: number) => {
        const userId = auth.currentUser?.uid;
        if (!userId) return;
        const now = Date.now();
        const title = firstUserMessage.slice(0, 50) + (firstUserMessage.length > 50 ? "…" : "");
        const existingMeta = sessions.find(s => s.id === sessionId);
        const updatedMeta: SessionMeta = { id: sessionId, title, createdAt: existingMeta?.createdAt || now, updatedAt: now, messageCount: msgCount };
        const existingIndex = sessions.findIndex(s => s.id === sessionId);
        let newSessions = existingIndex >= 0 ? sessions.map((s, i) => i === existingIndex ? updatedMeta : s) : [updatedMeta, ...sessions];
        newSessions = newSessions.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_SESSIONS);
        setSessions(newSessions);
        try { await setDoc(doc(db, "chatHistory", INDEX_DOC_ID(userId)), { sessions: newSessions, updatedAt: serverTimestamp() }, { merge: false }); }
        catch (err) { console.error("Erreur update index:", err); }
    };

    const deleteCurrentSession = async () => {
        const userId = auth.currentUser?.uid;
        if (!userId || !currentSessionId) return;
        const newSessions = sessions.filter(s => s.id !== currentSessionId);
        setSessions(newSessions);
        try {
            await Promise.all([
                setDoc(doc(db, "chatHistory", SESSION_DOC_ID(userId, currentSessionId)), { messages: [], deleted: true, updatedAt: serverTimestamp() }, { merge: false }),
                setDoc(doc(db, "chatHistory", INDEX_DOC_ID(userId)), { sessions: newSessions, updatedAt: serverTimestamp() }, { merge: false }),
            ]);
        } catch (err) { console.error("Erreur suppression:", err); }
        setShowDeleteConfirm(false);
        setCurrentSessionId(null);
        setMessages([]);
        setView("sessions");
    };

    // ── Image ─────────────────────────────────────────────────────────────────
    // FIX B : useCallback stable — dépend uniquement de onExercisesChange
    // Les useEffect paste/drag utilisent handleImageUpload via ref pour éviter
    // de les re-monter à chaque fois que handleImageUpload change.
    const handleImageUpload = useCallback(async (file: File) => {
        const userId = auth.currentUser?.uid;
        if (!userId) { addMsg("assistant", "❌ Vous devez être connecté."); return; }
        if (file.size > 5 * 1024 * 1024) { addMsg("assistant", "❌ Image trop lourde (max 5MB)"); return; }

        setUploadingImage(true);
        setCurrentSessionId(prev => {
            if (!prev) { isFirstMessageSave.current = true; setView("chat"); return Date.now().toString(); }
            return prev;
        });

        const reader = new FileReader();
        reader.onload = (e) => setMessages(prev => [...prev, {
            id: Date.now().toString(), role: "user", content: "",
            timestamp: new Date(), imagePreview: e.target?.result as string
        }]);
        reader.readAsDataURL(file);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);

        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch(
                buildApiUrl(apiConfig.endpoints.assistant.extractExercise, { user_id: userId }),
                { method: "POST", body: formData, signal: controller.signal }
            );
            if (res.status === 429) {
                const d = await res.json();
                addMsg("assistant", `🚫 Limite atteinte (${d.quota?.used}/${d.quota?.limit})\n\n⏰ Réinitialisation dans ${hoursUntilMidnight()}h`);
                return;
            }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (data.success && data.exercise) {
                const newExo: ExoContext = {
                    id: data.exercise.id, title: data.exercise.title,
                    statement: data.exercise.statement, difficulty: data.exercise.difficulty,
                    tags: data.exercise.tags, source: "photo"
                };
                setActiveExercises(prev => {
                    const updated = [...prev, newExo];
                    onExercisesChange?.(updated);
                    return updated;
                });
                let content = `✅ **${data.exercise.title}**\n\n${data.exercise.statement}`;
                if (data.exercise.questions?.length > 0)
                    content += `\n\n**Questions :**\n\n${data.exercise.questions.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n\n")}`;
                if (data.exercise.warning) content += `\n\n⚠️ ${data.exercise.warning}`;
                addMsg("assistant", content);
            } else throw new Error(data.error || "Erreur extraction");
        } catch (err: any) {
            if (err?.name === "AbortError") {
                addMsg("assistant", "⏱️ L'analyse a pris trop de temps. Réessaie dans quelques secondes.");
            } else {
                addMsg("assistant", "❌ Impossible d'analyser l'image.");
            }
        } finally {
            clearTimeout(timeoutId);
            setUploadingImage(false);
        }
    }, [onExercisesChange]);

    // ── FIX B (suite) : ref pour les event listeners paste/drag ──────────────
    // On stocke handleImageUpload dans une ref — les event listeners la lisent
    // via la ref et n'ont donc JAMAIS besoin d'être re-montés quand elle change.
    const handleImageUploadRef = useRef(handleImageUpload);
    useEffect(() => { handleImageUploadRef.current = handleImageUpload; }, [handleImageUpload]);

    // paste — dépend uniquement de view, lit handleImageUpload via ref
    useEffect(() => {
        const h = async (e: ClipboardEvent) => {
            if (view !== "chat") return;
            const items = e.clipboardData?.items;
            if (!items) return;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf("image") !== -1) {
                    e.preventDefault();
                    const blob = items[i].getAsFile();
                    if (blob) await handleImageUploadRef.current(blob);
                    break;
                }
            }
        };
        document.addEventListener("paste", h);
        return () => document.removeEventListener("paste", h);
    }, [view]); // view seul — pas de handleImageUpload dans les deps

    // drag/drop — dépend uniquement de view, lit handleImageUpload via ref
    useEffect(() => {
        const dropZone = dropZoneRef.current;
        if (!dropZone || view !== "chat") return;
        const onDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragging(true); };
        const onDragLeave = (e: DragEvent) => { e.preventDefault(); if (e.target === dropZone) setIsDragging(false); };
        const onDrop = async (e: DragEvent) => {
            e.preventDefault(); setIsDragging(false);
            const f = e.dataTransfer?.files?.[0];
            if (f?.type.startsWith("image/")) await handleImageUploadRef.current(f);
        };
        dropZone.addEventListener("dragover", onDragOver);
        dropZone.addEventListener("dragleave", onDragLeave);
        dropZone.addEventListener("drop", onDrop);
        return () => {
            dropZone.removeEventListener("dragover", onDragOver);
            dropZone.removeEventListener("dragleave", onDragLeave);
            dropZone.removeEventListener("drop", onDrop);
        };
    }, [view]); // view seul — pas de handleImageUpload dans les deps

    // ── Enregistrer le handler stable ────────────────────────────────────────
    useEffect(() => {
        if (onImageCapture) onImageCapture(handleImageUpload);
    }, [onImageCapture, handleImageUpload]);

    const removeExercise = (exoId: string) => { const u = activeExercises.filter(ex => ex.id !== exoId); setActiveExercises(u); onExercisesChange?.(u); };

    // ── Question ──────────────────────────────────────────────────────────────
    const askAI = async () => {
        if (!question.trim()) return;
        const userId = auth.currentUser?.uid;
        if (!userId) { addMsg("assistant", "❌ Connexion requise"); return; }
        const sessionId = currentSessionId || Date.now().toString();
        if (!currentSessionId) { setCurrentSessionId(sessionId); isFirstMessageSave.current = true; }
        const userMessage: Message = { id: Date.now().toString(), role: "user", content: question.trim(), timestamp: new Date() };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setQuestion("");
        setLoading(true);
        const firstUserMsg = newMessages.find(m => m.role === "user");
        if (firstUserMsg) updateIndex(sessionId, firstUserMsg.content, newMessages.length);
        try {
            const params = new URLSearchParams({ user_id: userId, question: userMessage.content, user_level: userLevel, user_subject: userSubject });
            if (exoContext) {
                params.append("exo_id", exoContext.id);
                params.append("exo_title", exoContext.title);
                if (exoContext.statement) params.append("exo_statement", exoContext.statement);
                if (exoContext.solution) params.append("exo_solution", exoContext.solution);
                if (exoContext.difficulty) params.append("exo_difficulty", exoContext.difficulty);
                if (exoContext.tags?.length) params.append("exo_tags", exoContext.tags.join(", "));
            }
            const history = messages.filter(m => !m.imagePreview && m.content).slice(-4).map(m => `${m.role === "user" ? "Élève" : "Assistant"}: ${m.content}`).join("\n");
            if (history) params.append("conversation_history", history);
            if (activeExercises.length > 0) params.append("active_exercises", JSON.stringify(activeExercises.map(ex => ({ id: ex.id, title: ex.title, order: ex.order || 0, statement: ex.statement || "", solution: ex.solution || "", difficulty: ex.difficulty || "", tags: ex.tags?.join(", ") || "", level: ex.level || "", subject: ex.subject || "", source: ex.source || "platform" }))));
            const res = await fetch(buildApiUrl(apiConfig.endpoints.assistant.exo, Object.fromEntries(params)));
            if (res.status === 429) { const d = await res.json(); addMsg("assistant", `🚫 Limite quotidienne atteinte !\n\n⏰ Réinitialisation dans ${hoursUntilMidnight()}h${minutesUntilMidnight().toString().padStart(2, "0")}\n\n${d.quota?.plan === "gratuit" ? "🎯 Passez au plan Élève pour 150 questions/jour !" : ""}`); setLoading(false); textareaRef.current?.focus(); return; }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            addMsg("assistant", data.response || data.error || "Erreur lors de la réponse");
        } catch { addMsg("assistant", "❌ Erreur lors de la requête à l'assistant."); }
        finally { setLoading(false); textareaRef.current?.focus(); }
    };

    const addMsg = (role: "user" | "assistant", content: string) => setMessages(prev => [...prev, { id: (Date.now() + Math.random()).toString(), role, content, timestamp: new Date() }]);
    const hoursUntilMidnight = () => { const now = new Date(); const m = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)); return Math.floor((m.getTime() - now.getTime()) / 3600000); };
    const minutesUntilMidnight = () => { const now = new Date(); const m = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)); return Math.floor(((m.getTime() - now.getTime()) % 3600000) / 60000); };
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askAI(); } };

    // ── VUE SESSIONS ──────────────────────────────────────────────────────────
    if (view === "sessions") return (
        <div className="h-full flex flex-col bg-white">
            <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-teal-700 flex items-center justify-center"><span className="text-white text-xs font-bold">IA</span></div>
                    <h2 className="text-sm font-semibold text-gray-800">Assistant IA</h2>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={createNewSession} className="flex items-center gap-1.5 bg-teal-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-teal-800 transition">
                        <Plus size={13} /> Nouvelle session
                    </button>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-400 ml-1"><X size={16} /></button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto">
                {historyLoading ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="flex items-center gap-2"><div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" /><div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} /><div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} /></div>
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-6">
                        <div className="w-14 h-14 rounded-2xl bg-teal-700 flex items-center justify-center mb-4"><span className="text-white text-xl font-bold">IA</span></div>
                        <h3 className="text-base font-semibold text-gray-800 mb-1">Aucune session</h3>
                        <p className="text-sm text-gray-500 mb-5">Commence une nouvelle session pour poser tes questions</p>
                        <button onClick={createNewSession} className="flex items-center gap-2 bg-teal-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-teal-800 transition"><Plus size={16} /> Nouvelle session</button>
                    </div>
                ) : (
                    <div className="p-3 space-y-1">
                        {sessions.map(session => (
                            <button key={session.id} onClick={() => openSession(session.id)} className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-50 transition">
                                <p className="text-sm font-medium text-gray-800 line-clamp-2">{session.title || "Session sans titre"}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Clock size={11} className="text-gray-300" />
                                    <span className="text-xs text-gray-400">{formatRelativeDate(session.updatedAt)}</span>
                                    <span className="text-xs text-gray-300">·</span>
                                    <span className="text-xs text-gray-400">{session.messageCount} message{session.messageCount > 1 ? "s" : ""}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    // ── VUE CHAT ──────────────────────────────────────────────────────────────
    return (
        <div ref={dropZoneRef} className="h-full flex flex-col bg-white relative">
            {isDragging && (
                <div className="absolute inset-0 bg-teal-500/10 border-4 border-dashed border-teal-500 z-50 flex items-center justify-center">
                    <div className="text-center bg-white p-6 rounded-xl shadow-lg"><Upload size={48} className="text-teal-600 mx-auto mb-2" /><p className="text-lg font-semibold text-teal-700">Dépose ton image ici</p></div>
                </div>
            )}
            {showDeleteConfirm && (
                <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
                    <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-xs text-center">
                        <Trash2 className="w-8 h-8 text-red-400 mx-auto mb-3" />
                        <p className="font-semibold text-gray-800 mb-1">Supprimer cette session ?</p>
                        <p className="text-xs text-gray-500 mb-4">Cette action est irréversible.</p>
                        <div className="flex gap-2">
                            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition">Annuler</button>
                            <button onClick={deleteCurrentSession} className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition">Supprimer</button>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setView("sessions")} className="p-1 text-gray-400 hover:text-teal-700 transition rounded"><ChevronLeft size={18} /></button>
                        <div className="w-6 h-6 rounded-full bg-teal-700 flex items-center justify-center flex-shrink-0"><span className="text-white text-[9px] font-bold">IA</span></div>
                        <h2 className="text-sm font-semibold text-gray-800 truncate">{sessions.find(s => s.id === currentSessionId)?.title || "Nouvelle session"}</h2>
                        {messages.length > 0 && <button onClick={() => setShowDeleteConfirm(true)} className="ml-1 p-1 text-gray-300 hover:text-red-400 transition rounded flex-shrink-0"><Trash2 size={13} /></button>}
                        <button onClick={onClose} className="ml-auto p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-400 flex-shrink-0"><X size={16} /></button>
                    </div>
                    {activeExercises.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap mt-2">
                            {activeExercises.slice(0, 3).map(ex => (
                                <div key={ex.id} className="flex items-center gap-1 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full text-xs">
                                    <span className="text-teal-600">{ex.source === "pdf" ? "📄" : ex.source === "photo" ? "📷" : `#${ex.order}`}</span>
                                    <span className="text-teal-800 truncate max-w-[100px] font-medium">{ex.title}</span>
                                    {(ex.source === "photo" || ex.source === "pdf") && <button onClick={() => removeExercise(ex.id)} className="text-teal-400 hover:text-red-500 transition ml-0.5"><FaTimes size={9} /></button>}
                                </div>
                            ))}
                            {activeExercises.length > 3 && <span className="text-xs text-gray-400">+{activeExercises.length - 3}</span>}
                        </div>
                    )}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
                {historyLoading ? (
                    <div className="h-full flex items-center justify-center"><div className="flex items-center gap-2 text-gray-400 text-sm"><div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" /><div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} /><div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} /><span className="ml-1">Chargement…</span></div></div>
                ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-6">
                        <div className="w-14 h-14 rounded-2xl bg-teal-700 flex items-center justify-center mb-4 shadow-md"><span className="text-white text-xl font-bold">IA</span></div>
                        <h3 className="text-base font-semibold text-gray-800 mb-1">Nouvelle session</h3>
                        <p className="text-sm text-gray-500 mb-6">Pose ta question ou envoie une image de ton exercice</p>
                        <div className="w-full max-w-xs space-y-2 text-left">
                            <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2"><Paperclip size={13} className="flex-shrink-0" /><span>Clique sur 📎 pour envoyer une image</span></div>
                            <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2"><Upload size={13} className="flex-shrink-0" /><span>Glisse-dépose ou colle (Ctrl+V)</span></div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === "user" ? "bg-teal-700 text-white" : "bg-gray-100 text-gray-800"}`}>
                                    {msg.role === "assistant" && <div className="flex items-center gap-1.5 mb-2"><div className="w-4 h-4 rounded-full bg-teal-700 flex items-center justify-center"><span className="text-white text-[8px] font-bold">IA</span></div><span className="text-xs font-semibold text-teal-700">Assistant</span></div>}
                                    {msg.imagePreview && <div className="mb-2"><img src={msg.imagePreview} alt="Capture" className="max-w-full rounded-lg border-2 border-white/30 shadow-md" style={{ maxHeight: "300px" }} /></div>}
                                    {msg.content && <div className="leading-relaxed">{msg.role === "assistant" ? renderMessageContent(msg.content) : <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}</div>}
                                    <span className="text-xs opacity-50 mt-1.5 block">{msg.timestamp.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                                </div>
                            </div>
                        ))}
                        {(loading || uploadingImage) && (
                            <div className="flex justify-start"><div className="bg-gray-100 rounded-2xl px-4 py-3"><div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" /><div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} /><div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} /><span className="text-xs text-gray-500 ml-1.5">{uploadingImage ? "Analyse..." : "Réflexion..."}</span></div></div></div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>
            <div className="px-3 pb-3 pt-2 border-t">
                <input ref={fileInputGalleryRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { handleImageUpload(f); setShowAttachMenu(false); } e.target.value = ""; }} />
                <input ref={fileInputCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { handleImageUpload(f); setShowAttachMenu(false); } e.target.value = ""; }} />
                <div className="flex items-end gap-2 bg-gray-100 rounded-2xl px-3 py-2.5">
                    <div className="relative flex-shrink-0" ref={attachMenuRef}>
                        <button onClick={() => setShowAttachMenu(v => !v)} disabled={loading || uploadingImage} className={`p-1.5 rounded-lg transition disabled:opacity-50 ${showAttachMenu ? "bg-teal-700 text-white" : "text-gray-500 hover:text-teal-700 hover:bg-gray-200"}`}><Paperclip size={18} /></button>
                        {showAttachMenu && (
                            <div className="absolute bottom-10 left-0 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 w-44 z-50 overflow-hidden">
                                <button onClick={() => fileInputGalleryRef.current?.click()} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition text-left"><ImagePlus size={15} className="text-teal-600 flex-shrink-0" /><span className="text-sm text-gray-700">Galerie photos</span></button>
                                <button onClick={() => fileInputCameraRef.current?.click()} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition text-left"><Camera size={15} className="text-teal-600 flex-shrink-0" /><span className="text-sm text-gray-700">Prendre une photo</span></button>
                            </div>
                        )}
                    </div>
                    <textarea ref={textareaRef} className="flex-1 bg-transparent resize-none focus:outline-none text-sm text-gray-800 placeholder-gray-400 max-h-32 py-0.5" rows={1}
                        placeholder={activeExercises.length > 0 ? "Pose ta question sur les exercices..." : "Pose ta question..."}
                        value={question} onChange={(e) => { setQuestion(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 128) + "px"; }}
                        onKeyDown={handleKeyDown} disabled={loading || uploadingImage || historyLoading} />
                    <button onClick={askAI} disabled={loading || uploadingImage || !question.trim() || historyLoading}
                        className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition ${question.trim() && !loading && !uploadingImage && !historyLoading ? "bg-teal-700 hover:bg-teal-800 text-white shadow-sm" : "bg-gray-300 text-gray-400 cursor-not-allowed"}`}>
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
});

export default ExoAssistantPanel;