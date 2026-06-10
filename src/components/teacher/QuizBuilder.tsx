"use client";

import { Plus, Trash2, X, ClipboardList } from "lucide-react";
import type { QuizQuestion } from "@/type/teacher";

interface Props {
  questions: QuizQuestion[];
  onChange: (questions: QuizQuestion[]) => void;
}

const EMPTY_QUESTION: QuizQuestion = {
  text: "",
  options: ["", ""],
  correctIndex: 0,
  requireJustification: false,
};

export default function QuizBuilder({ questions, onChange }: Props) {
  const addQuestion = () => onChange([...questions, { ...EMPTY_QUESTION, options: ["", ""] }]);

  const removeQuestion = (i: number) => onChange(questions.filter((_, idx) => idx !== i));

  const updateQ = (i: number, patch: Partial<QuizQuestion>) =>
    onChange(questions.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));

  const addOption = (qi: number) => {
    const q = questions[qi];
    if (q.options.length >= 4) return;
    updateQ(qi, { options: [...q.options, ""] });
  };

  const removeOption = (qi: number, oi: number) => {
    const q = questions[qi];
    if (q.options.length <= 2) return;
    const opts = q.options.filter((_, i) => i !== oi);
    const correct = q.correctIndex >= opts.length ? 0 : q.correctIndex;
    updateQ(qi, { options: opts, correctIndex: correct });
  };

  const updateOption = (qi: number, oi: number, val: string) =>
    updateQ(qi, { options: questions[qi].options.map((o, i) => (i === oi ? val : o)) });

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ClipboardList className="w-4 h-4 text-teal-700" />
        <p className="text-sm font-semibold text-gray-700">
          Quiz ({questions.length} question{questions.length !== 1 ? "s" : ""})
        </p>
        <span className="text-xs text-gray-400">— optionnel</span>
      </div>

      {/* Question cards */}
      {questions.map((q, qi) => (
        <div key={qi} className="border border-gray-200 rounded-xl p-4 bg-white space-y-3">
          {/* Question header */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
              Q{qi + 1}
            </span>
            <button
              type="button"
              title="Supprimer la question"
              onClick={() => removeQuestion(qi)}
              className="text-gray-400 hover:text-red-500 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Question text */}
          <textarea
            value={q.text}
            onChange={(e) => updateQ(qi, { text: e.target.value })}
            placeholder="Énoncé de la question…"
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500 resize-none"
          />

          {/* Options */}
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium">
              Réponses — <span className="text-teal-700">sélectionnez la bonne réponse</span>
            </p>
            {q.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${qi}`}
                  checked={q.correctIndex === oi}
                  onChange={() => updateQ(qi, { correctIndex: oi })}
                  title="Réponse correcte"
                  className="accent-teal-700 w-4 h-4 flex-shrink-0 cursor-pointer"
                />
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => updateOption(qi, oi, e.target.value)}
                  placeholder={`Réponse ${oi + 1}…`}
                  className={`flex-1 border rounded-lg px-2 py-1.5 text-sm outline-none focus:border-teal-500 transition ${
                    q.correctIndex === oi ? "border-teal-400 bg-teal-50" : "border-gray-200"
                  }`}
                />
                {q.options.length > 2 && (
                  <button
                    type="button"
                    title="Supprimer cette option"
                    onClick={() => removeOption(qi, oi)}
                    className="text-gray-400 hover:text-red-500 transition flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Footer: add option + justification toggle */}
          <div className="flex items-center justify-between pt-1">
            {q.options.length < 4 ? (
              <button
                type="button"
                onClick={() => addOption(qi)}
                className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 transition"
              >
                <Plus className="w-3 h-3" /> Ajouter une option
              </button>
            ) : (
              <span className="text-xs text-gray-300">Maximum 4 options</span>
            )}
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={q.requireJustification}
                onChange={(e) => updateQ(qi, { requireJustification: e.target.checked })}
                className="accent-teal-700"
              />
              Justification requise
            </label>
          </div>
        </div>
      ))}

      {/* Add question */}
      <button
        type="button"
        onClick={addQuestion}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-400 hover:border-teal-400 hover:text-teal-600 transition"
      >
        <Plus className="w-4 h-4" />
        {questions.length === 0 ? "Ajouter des questions au quiz" : "Ajouter une question"}
      </button>
    </div>
  );
}
