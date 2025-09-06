"use client";

import { Lightbulb, Users, Target } from "lucide-react";

export default function AboutUsPage() {
  return (
    <div className="bg-white min-h-screen text-gray-800">
      {/* Hero */}
      <section className="bg-gradient-to-r from-[#0D1B2A] to-[#1B9AAA] py-20 text-white">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h1 className="text-5xl font-bold mb-4">À propos de Rosaine Academy</h1>
          <p className="text-lg opacity-90 max-w-3xl mx-auto">
            Transformer l’apprentissage grâce à la pédagogie, la technologie et l’innovation.
          </p>
        </div>
      </section>

      {/* Vision / Mission / Équipe */}
      <section className="max-w-5xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-8">
        <div className="bg-gray-50 shadow-lg rounded-2xl p-6 text-center border border-gray-200">
          <Lightbulb className="mx-auto h-12 w-12 text-[#1B9AAA] mb-4" />
          <h3 className="text-xl font-semibold mb-2">Notre Vision</h3>
          <p className="text-gray-600">
            Offrir une éducation moderne, motivante et adaptée à chaque étudiant,
            avec des contenus pertinents et interactifs.
          </p>
        </div>

        <div className="bg-gray-50 shadow-lg rounded-2xl p-6 text-center border border-gray-200">
          <Target className="mx-auto h-12 w-12 text-[#4CAF50] mb-4" />
          <h3 className="text-xl font-semibold mb-2">Notre Mission</h3>
          <p className="text-gray-600">
            Structurer l’apprentissage étape par étape et intégrer des outils
            comme des quiz et un chatbot intelligent pour mieux vous accompagner.
          </p>
        </div>

        <div className="bg-gray-50 shadow-lg rounded-2xl p-6 text-center border border-gray-200">
          <Users className="mx-auto h-12 w-12 text-[#1B9AAA] mb-4" />
          <h3 className="text-xl font-semibold mb-2">Notre Équipe</h3>
          <p className="text-gray-600">
            Une startup composée d’ingénieurs passionnés par le développement web
            et l’intelligence artificielle, déterminés à transformer l’éducation.
          </p>
        </div>
      </section>

      {/* Texte final */}
      <section className="max-w-4xl mx-auto px-6 pb-20 text-center">
        <p className="text-lg text-gray-700 leading-relaxed">
          Chez <span className="font-semibold text-[#1B9AAA]">Rosaine Academy</span>,
          chaque étape franchie vous rapproche de vos objectifs. Nous croyons que
          l’éducation doit être à la fois sérieuse et engageante, pour vous préparer
          à vos examens tout en gardant le plaisir d’apprendre.
        </p>
      </section>
    </div>
  );
}
