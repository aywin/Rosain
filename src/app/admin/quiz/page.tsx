import QuizForm from "@/components/admin/QuizForm";
import QuizList from "@/components/admin/QuizList";

export default function QuizPage() {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Formulaire de création */}
      <div className="bg-white shadow rounded p-6">
        <QuizForm />
      </div>

      {/* Liste des quiz existants */}
      <div className="bg-white shadow rounded p-6">
        <h2 className="text-xl font-bold mb-4">📋 Quiz existants</h2>
        <QuizList />
      </div>
    </div>
  );
}
