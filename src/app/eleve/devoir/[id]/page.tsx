"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  ArrowLeft, ClipboardList, Clock, Check, Loader2, AlertCircle, Eye,
} from "lucide-react";
import QuizPlayerEleve from "@/components/teacher/QuizPlayerEleve";
import FileUploadZone from "@/components/teacher/FileUploadZone";
import { getOrCreateSubmission, submitWork, saveQuizAnswers } from "@/helpers/teacherFetchers";
import { storagePaths } from "@/helpers/storageHelpers";
import type { Assignment, Submission, QuizAnswerItem } from "@/type/teacher";

export default function DevoirPage() {
  const { id: assignmentId } = useParams<{ id: string }>();
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);

  const [text, setText] = useState("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [submittingText, setSubmittingText] = useState(false);
  const [textSubmitted, setTextSubmitted] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [teacherFileUrl, setTeacherFileUrl] = useState<string | null>(null);
  const [teacherFileName, setTeacherFileName] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/login"); return; }
      setUserId(user.uid);

      const aSnap = await getDoc(doc(db, "assignments", assignmentId));
      if (!aSnap.exists()) { router.push("/eleve"); return; }
      const a = { id: aSnap.id, ...aSnap.data() } as Assignment;
      setAssignment(a);

      // Fichier joint directement à l'assignation (prioritaire)
      if (a.fileUrl) {
        setTeacherFileUrl(a.fileUrl);
        setTeacherFileName(a.fileName || "Fichier du professeur");
      } else if (a.contentId) {
        // Fallback : fichier via bibliothèque prof (contentId → teacherContent)
        const cSnap = await getDoc(doc(db, "teacherContent", a.contentId));
        if (cSnap.exists()) {
          const cData = cSnap.data();
          if (cData.fileUrl) {
            setTeacherFileUrl(cData.fileUrl);
            setTeacherFileName(cData.fileName || "Fichier du professeur");
          }
        }
      }

      const sub = await getOrCreateSubmission(assignmentId, user.uid, a.groupId);
      setSubmission(sub);
      setText(sub.textContent || "");
      setFileUrl((sub as any).fileUrl || null);
      setFileName((sub as any).fileName || null);
      setTextSubmitted(sub.status === "submitted" || sub.status === "corrected");
      setQuizSubmitted(!!(sub.quizAnswers && sub.quizAnswers.length > 0));
      setLoading(false);
    });
    return () => unsub();
  }, [assignmentId, router]);

  const handleSubmitText = async () => {
    if (!userId) return;
    setSubmittingText(true);
    await submitWork(assignmentId, userId, text.trim(), undefined, fileUrl || undefined, fileName || undefined);
    setSubmission((prev) => prev ? { ...prev, status: "submitted", textContent: text.trim() } : prev);
    setTextSubmitted(true);
    setSubmittingText(false);
  };

  const handleSubmitQuiz = async (answers: QuizAnswerItem[]) => {
    if (!userId || !assignment) return;
    await saveQuizAnswers(assignmentId, userId, assignment.groupId, answers);
    setSubmission((prev) => prev ? { ...prev, quizAnswers: answers } : prev);
    setQuizSubmitted(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-7 h-7 animate-spin text-teal-700" />
      </div>
    );
  }

  const isCorrected = submission?.status === "corrected";
  const isSubmitted = submission?.status === "submitted";
  const canEditText = !isSubmitted && !isCorrected;
  const hasQuiz = (assignment?.questions?.length || 0) > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-teal-700 text-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
          <button
            type="button"
            onClick={() => router.push("/eleve")}
            className="flex items-center gap-2 text-teal-100 hover:text-white text-sm mb-3 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Retour à mes travaux
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold">{assignment?.title}</h1>
              <span className="text-teal-100 text-xs">Devoir</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Deadline */}
        {assignment?.deadline && (
          <div className="flex items-center gap-2 text-sm text-gray-500 bg-white rounded-xl px-4 py-3 border border-gray-100">
            <Clock className="w-4 h-4 text-amber-500" />
            Date limite :{" "}
            <span className="font-medium text-gray-700">
              {new Date((assignment.deadline as any)?.toDate?.() || assignment.deadline).toLocaleString("fr-FR")}
            </span>
          </div>
        )}

        {/* Instructions */}
        {assignment?.instructions && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800 mb-1">Consignes</p>
                <p className="text-sm text-amber-700 whitespace-pre-wrap">{assignment.instructions}</p>
              </div>
            </div>
          </div>
        )}

        {/* Teacher attached file */}
        {teacherFileUrl && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Eye className="w-4 h-4 text-blue-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-blue-600 font-medium">Document fourni par le professeur</p>
              <p className="text-sm text-blue-800 font-semibold truncate">{teacherFileName}</p>
            </div>
            <a
              href={teacherFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium bg-white px-3 py-1.5 rounded-lg border border-blue-200 hover:border-blue-300 transition flex-shrink-0"
            >
              Ouvrir
            </a>
          </div>
        )}

        {/* Correction result */}
        {isCorrected && submission && (
          <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Check className="w-5 h-5 text-green-600" />
              <p className="font-semibold text-green-800">Devoir corrigé par votre professeur</p>
            </div>
            {submission.grade !== undefined && (
              <div className="text-4xl font-bold text-green-700 mb-2">
                {submission.grade}<span className="text-xl text-green-500">/20</span>
              </div>
            )}
            {submission.feedback && (
              <div className="mt-2">
                <p className="text-xs text-green-700 font-medium mb-1">Commentaire du professeur</p>
                <p className="text-sm text-green-800 italic bg-white rounded-lg px-3 py-2 border border-green-100">
                  "{submission.feedback}"
                </p>
              </div>
            )}
          </div>
        )}

        {/* Submitted notice */}
        {(isSubmitted || textSubmitted) && !isCorrected && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3">
            <Check className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Devoir soumis</p>
              <p className="text-xs text-amber-700">En attente de correction par votre professeur.</p>
            </div>
          </div>
        )}

        {/* Quiz */}
        {hasQuiz && assignment?.questions && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <QuizPlayerEleve
              questions={assignment.questions}
              existingAnswers={submission?.quizAnswers}
              submitted={quizSubmitted}
              onSubmit={handleSubmitQuiz}
            />
          </div>
        )}

        {/* Text answer */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <label className="text-sm font-semibold text-gray-700 mb-3 block">
            {canEditText ? "Rédigez votre réponse écrite" : "Votre réponse écrite"}
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!canEditText}
            rows={8}
            placeholder="Rédigez votre devoir ici…"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-500 resize-none disabled:bg-gray-50 disabled:text-gray-600 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-gray-400 mt-1.5">{text.length} caractère(s)</p>
        </div>

        {/* File upload / read-only file view */}
        {canEditText ? (
          userId && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <FileUploadZone
                storagePath={storagePaths.submission(userId, assignmentId, "")}
                accept="pdfAndImages"
                label="Joindre un fichier (photo de votre travail, PDF) — optionnel"
                initialUrl={fileUrl || undefined}
                initialName={fileName || undefined}
                onUploadComplete={(url, name) => { setFileUrl(url); setFileName(name); }}
                onRemove={() => { setFileUrl(null); setFileName(null); }}
              />
            </div>
          )
        ) : fileUrl ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <p className="text-sm text-gray-600 flex-1">Fichier joint :</p>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium transition"
            >
              <Eye className="w-4 h-4" /> {fileName || "Voir le fichier"}
            </a>
          </div>
        ) : null}

        {/* Submit */}
        {canEditText && (
          <button
            type="button"
            onClick={handleSubmitText}
            disabled={submittingText || (!text.trim() && !fileUrl)}
            className="w-full bg-teal-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-teal-800 disabled:opacity-50 flex items-center justify-center gap-2 transition"
          >
            {submittingText ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Soumettre le devoir
          </button>
        )}
      </div>
    </div>
  );
}
