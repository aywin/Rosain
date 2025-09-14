import QuizForm from "@/components/admin/quiz/QuizForm";

export default function QuizPage() {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Formulaire de création */}
      <div className="bg-white shadow rounded p-6">
        <QuizForm />
      </div>

     
    </div>
  );
}
