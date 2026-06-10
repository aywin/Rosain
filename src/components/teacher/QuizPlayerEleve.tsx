"use client";

import { useState } from "react";
import { Check, X, Loader2, ClipboardList } from "lucide-react";
import type { QuizQuestion, QuizAnswerItem } from "@/type/teacher";

interface Props {
  questions: QuizQuestion[];
  existingAnswers?: QuizAnswerItem[];
  submitted?: boolean;
  onSubmit: (answers: QuizAnswerItem[]) => Promise<void>;
}

export default function QuizPlayerEleve({ questions, existingAnswers, submitted: initialSubmitted, onSubmit }: Props) {
  // answers keyed by questionIndex
  const [selected, setSelected] = useState<Record<number, number>>(
    Object.fromEntries((existingAnswers || []).map((a) => [a.questionIndex, a.selectedOption]))
  );
  const [justifications, setJustifications] = useState<Record<number, string>>(
    Object.fromEntries((existingAnswers || []).map((a) => [a.questionIndex, a.justification]))
  );
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(initialSubmitted ?? false);
  const [results, setResults] = useState<QuizAnswerItem[] | null>(existingAnswers || null);

  const answeredCount = questions.filter((_, i) => selected[i] !== undefined && selected[i] >= 0).length;
  const allAnswered = answeredCount === questions.length;

  const handleSelect = (qi: number, oi: number) => {
    if (done) return;
    setSelected((prev) => ({ ...prev, [qi]: oi }));
  };

  const handleJustification = (qi: number, val: string) => {
    if (done) return;
    setJustifications((prev) => ({ ...prev, [qi]: val }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const answers: QuizAnswerItem[] = questions.map((q, i) => ({
      questionIndex: i,
      selectedOption: selected[i] ?? -1,
      justification: justifications[i] || "",
      isCorrect: selected[i] === q.correctIndex,
    }));
    await onSubmit(answers);
    setResults(answers);
    setDone(true);
    setSubmitting(false);
  };

  const score = results ? results.filter((a) => a.isCorrect).length : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-teal-700" />
          <p className="font-semibold text-gray-800 text-sm">
            Quiz — {questions.length} question{questions.length !== 1 ? "s" : ""}
          </p>
        </div>
        {done && score !== null ? (
          <div className="flex items-center gap-1.5 bg-teal-50 text-teal-700 px-3 py-1 rounded-xl text-sm font-bold">
            <Check className="w-4 h-4" />
            {score}/{questions.length} correcte{score > 1 ? "s" : ""}
          </div>
        ) : (
          <span className="text-xs text-gray-500">
            {answeredCount}/{questions.length} répondue{answeredCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {!done && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-500 rounded-full transition-all"
            style={{ width: `${questions.length > 0 ? (answeredCount / questions.length) * 100 : 0}%` }}
          />
        </div>
      )}

      {/* Questions */}
      {questions.map((q, qi) => {
        const sel = selected[qi];
        const result = results?.find((r) => r.questionIndex === qi);
        const isCorrect = result?.isCorrect;

        return (
          <div
            key={qi}
            className={`border rounded-xl p-4 transition-colors ${
              done
                ? isCorrect
                  ? "border-green-200 bg-green-50/40"
                  : "border-red-200 bg-red-50/40"
                : "border-gray-200 bg-white"
            }`}
          >
            {/* Question text */}
            <div className="flex items-start gap-2 mb-3">
              <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full flex-shrink-0">
                {qi + 1}
              </span>
              <p className="text-sm font-semibold text-gray-800 leading-relaxed">{q.text}</p>
            </div>

            {/* Options */}
            <div className="space-y-2">
              {q.options.map((opt, oi) => {
                const isSelected = sel === oi;
                const isCorrectOpt = q.correctIndex === oi;

                let cls = "border-gray-200 bg-white hover:border-teal-300 hover:bg-teal-50/30";
                if (done) {
                  if (isCorrectOpt) cls = "border-green-400 bg-green-50";
                  else if (isSelected && !isCorrectOpt) cls = "border-red-300 bg-red-50";
                  else cls = "border-gray-100 bg-gray-50/50";
                } else if (isSelected) {
                  cls = "border-teal-500 bg-teal-50";
                }

                return (
                  <div
                    key={oi}
                    onClick={() => handleSelect(qi, oi)}
                    className={`flex items-center gap-3 px-3 py-2.5 border rounded-lg transition-all ${cls} ${done ? "cursor-default" : "cursor-pointer"}`}
                  >
                    {/* Radio indicator */}
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected ? "border-teal-600 bg-teal-600" : "border-gray-300"
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>

                    {/* Option text */}
                    <span className={`text-sm flex-1 ${done && isCorrectOpt ? "font-semibold text-green-800" : "text-gray-700"}`}>
                      {opt}
                    </span>

                    {/* Result icon */}
                    {done && isCorrectOpt && (
                      <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </span>
                    )}
                    {done && isSelected && !isCorrectOpt && (
                      <span className="w-5 h-5 bg-red-400 rounded-full flex items-center justify-center flex-shrink-0">
                        <X className="w-3 h-3 text-white" />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Justification textarea */}
            {q.requireJustification && sel !== undefined && sel >= 0 && (
              <div className="mt-3">
                <label className="text-xs text-gray-500 font-medium mb-1 block">
                  Justifiez votre réponse :
                </label>
                <textarea
                  value={justifications[qi] || ""}
                  onChange={(e) => handleJustification(qi, e.target.value)}
                  disabled={done}
                  rows={2}
                  placeholder="Expliquez votre raisonnement…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500 resize-none disabled:bg-gray-50 disabled:text-gray-600 disabled:cursor-not-allowed"
                />
              </div>
            )}

            {/* Saved justification (read-only after submit) */}
            {done && result?.justification && (
              <div className="mt-2 text-xs text-gray-500 italic bg-white/70 rounded-lg px-3 py-1.5 border border-gray-100">
                Votre justification : "{result.justification}"
              </div>
            )}

            {/* Correction message */}
            {done && !isCorrect && (
              <div className="mt-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-1.5">
                Bonne réponse : <strong>{q.options[q.correctIndex]}</strong>
              </div>
            )}
          </div>
        );
      })}

      {/* Submit button */}
      {!done && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !allAnswered}
          className="w-full flex items-center justify-center gap-2 bg-teal-700 text-white py-3 rounded-xl text-sm font-semibold hover:bg-teal-800 disabled:opacity-50 transition"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          Valider mes réponses ({answeredCount}/{questions.length})
        </button>
      )}

      {/* Done summary */}
      {done && score !== null && (
        <div className={`rounded-xl p-4 text-center ${score === questions.length ? "bg-green-50 border border-green-200" : score >= questions.length / 2 ? "bg-amber-50 border border-amber-200" : "bg-red-50 border border-red-200"}`}>
          <p className="font-bold text-lg">
            {score}/{questions.length}
          </p>
          <p className="text-sm mt-0.5 text-gray-600">
            {score === questions.length
              ? "Parfait ! Toutes les réponses sont correctes."
              : score >= questions.length / 2
              ? "Bon résultat, continuez comme ça !"
              : "Revoyez le cours pour améliorer votre score."}
          </p>
        </div>
      )}
    </div>
  );
}
