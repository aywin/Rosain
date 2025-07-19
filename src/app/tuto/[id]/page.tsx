"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db } from "@/firebase";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import AssistantPanel from "@/components/AssistantPanel";
import Sidebar from "@/components/Sidebar";

interface Video {
  id: string;
  titre: string;
  url_video: string;
  ordre?: number;
}
interface Course {
  id: string;
  titre: string;
  id_niveau: string;
  id_matiere: string;
  description?: string;
}

export default function TutoPage() {
  const params = useParams();
  const router = useRouter();
  const courseId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id) && params.id.length > 0
      ? params.id[0]
      : undefined;

  const [showAssistant, setShowAssistant] = useState(false);
  const [current, setCurrent] = useState(0);
  const [videos, setVideos] = useState<Video[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  // Sécurité : Accès seulement pour les élèves inscrits
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async user => {
      if (!user || !courseId) {
        setAllowed(false);
        setLoading(false);
        return;
      }
      const q = query(
        collection(db, "enrollments"),
        where("id_user", "==", user.uid),
        where("id_course", "==", courseId)
      );
      const snap = await getDocs(q);
      setAllowed(!snap.empty);
    });
    return () => unsubscribe();
  }, [courseId]);

  // Récupère le cours
  useEffect(() => {
    if (!courseId) return;
    const fetchCourse = async () => {
      const snap = await getDoc(doc(db, "courses", courseId));
      if (snap.exists()) setCourse({ id: snap.id, ...snap.data() } as Course);
    };
    fetchCourse();
  }, [courseId]);

  // Récupère les vidéos du cours
  useEffect(() => {
    if (!courseId) return;
    const fetchVideos = async () => {
      const q = query(collection(db, "videos"), where("id_course", "==", courseId));
      const snap = await getDocs(q);
      const vids = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Video))
        .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
      setVideos(vids);
      setLoading(false);
    };
    fetchVideos();
  }, [courseId]);

  if (loading)
    return <div className="p-12">Chargement…</div>;

  if (!allowed)
    return (
      <div className="p-12 text-red-500">
        Accès refusé : vous n’êtes pas inscrit à ce cours.
        <button
          className="ml-4 underline text-blue-700"
          onClick={() => router.push("/mycourses")}
        >
          Retour à mes cours
        </button>
      </div>
    );

  if (!course)
    return <div className="p-12">Cours introuvable.</div>;

  if (videos.length === 0)
    return <div className="p-12">Aucune vidéo pour ce cours.</div>;

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar gauche : vidéos */}
      <Sidebar
        videos={videos.map((v, i) => ({
          id: v.id,
          title: v.titre
        }))}
        current={current}
        setCurrent={setCurrent}
      />

      {/* Centre : vidéo + bouton IA */}
      <div className="flex-1 flex flex-col bg-blue-100 relative overflow-y-auto">
        {/* Header du cours */}
        <div className="p-4 flex items-center justify-between bg-white border-b">
          <div>
            <h1 className="text-2xl font-bold mb-1">{course.titre}</h1>
            <div className="text-gray-700 text-sm mb-1">
              Niveau : <b>{course.id_niveau}</b> | Matière : <b>{course.id_matiere}</b>
            </div>
            {course.description && (
              <div className="text-gray-600 text-xs">{course.description}</div>
            )}
          </div>
          <button
            className="bg-blue-600 text-white px-3 py-1 rounded"
            onClick={() => router.push("/mycourses")}
          >
            Mes cours
          </button>
        </div>

        {/* Vidéo et bouton assistant */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
          <iframe
            className="w-[70%] aspect-video rounded-lg mt-6 shadow"
            src={videos[current].url_video}
            title={videos[current].titre}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
          {/* Bouton IA SOUS la vidéo */}
          <div className="w-[70%] flex justify-end mt-4">
            <button
              className="px-2 py-2 border rounded hover:bg-blue-700 hover:text-white transition"
              onClick={() => setShowAssistant(true)}
            >
              Ouvrir Assistant IA →
            </button>
          </div>
          {/* --------- TRANSCRIPTION ICI --------- */}
        <div className="w-[90%] mt-8 mb-8 bg-white rounded-lg shadow p-6 max-h-64 overflow-y-auto text-gray-800 text-base leading-relaxed">
          <h2 className="font-semibold mb-2 text-lg">Transcription de la vidéo</h2>
          <p>
            {`Bienvenue dans ce module vidéo. Aujourd’hui, nous allons explorer ensemble les concepts fondamentaux de notre sujet. Au début, il est important de se rappeler que la maîtrise progressive, étape par étape, permet d’aborder la complexité sans appréhension. Vous remarquerez au fil de la vidéo plusieurs exemples concrets et des explications détaillées qui illustrent les points abordés. N’hésitez pas à mettre en pause, revenir en arrière ou prendre des notes pour mieux assimiler les notions présentées. Les premières minutes sont dédiées à l’introduction du thème, suivies d’une présentation structurée qui détaille chaque élément important. Nous analyserons ensuite des cas pratiques afin de lier la théorie à la pratique. Si une notion reste floue, la transcription ci-dessous vous permettra de relire à votre rythme, et ainsi mieux comprendre le déroulement de la vidéo. Ce format a été conçu pour vous offrir une expérience d’apprentissage optimale, inspirée des meilleures plateformes éducatives comme Coursera. La clarté du propos et la structuration logique du contenu facilitent la mémorisation. Vers le milieu de la vidéo, nous effectuerons une synthèse intermédiaire, récapitulant les points essentiels. Cette approche séquencée favorise l’acquisition progressive des compétences. En fin de vidéo, un résumé général et quelques conseils pratiques vous seront proposés pour prolonger l’apprentissage au-delà du cours. N’oubliez pas que vous pouvez interagir avec l’assistant IA pour toute question ou approfondissement, en ouvrant le chat à droite. Nous vous encourageons également à partager vos interrogations ou vos retours d’expérience sur la plateforme. L’apprentissage en ligne devient ainsi plus interactif, personnalisé et efficace. Prenez le temps de parcourir cette transcription à votre rythme ; elle restera accessible à tout moment pour vos révisions futures. Bonne vidéo, et bon apprentissage à tous !`}
          </p>
        </div>
        </div>
      </div>

      {/* Sidebar droit : chatbot IA */}
      {showAssistant && (
        <div className="w-[350px] max-w-full border-l bg-white h-full flex flex-col shadow-lg z-20">
          <AssistantPanel onClose={() => setShowAssistant(false)} />
        </div>

      )}
      
    </div>
  );
}
