"use client";
export default function BlogSection() {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold mb-3">Blog & Astuces</h2>
      <div className="bg-white p-4 rounded shadow mb-3">
        <div className="font-bold mb-1">Comment rester motivé pour apprendre ?</div>
        <div className="text-gray-700 text-sm">Découvrez nos conseils pour garder le cap tout au long de votre parcours…</div>
        <button className="text-blue-700 underline text-sm mt-2">Lire l’article</button>
      </div>
      {/* Ajoute d’autres articles ou du contenu dynamique plus tard */}
    </section>
  );
}
