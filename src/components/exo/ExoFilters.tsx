"use client";

import { FaLayerGroup, FaBook, FaGraduationCap } from "react-icons/fa";

interface Level { id: string; name: string; }
interface Subject { id: string; name: string; }
interface Course { id: string; title: string; subject_id: string; level_id: string; }

interface ExoFiltersProps {
  levels: Level[];
  subjects: Subject[];
  courses: Course[];
  levelId: string;
  subjectId: string;
  courseId: string;
  setLevelId: (id: string) => void;
  setSubjectId: (id: string) => void;
  setCourseId: (id: string) => void;
}

export default function ExoFilters({
  levels, subjects, courses,
  levelId, subjectId, courseId,
  setLevelId, setSubjectId, setCourseId
}: ExoFiltersProps) {
  const filteredCourses = courses.filter(
    c => (!levelId || c.level_id === levelId) && (!subjectId || c.subject_id === subjectId)
  );

  return (
    <div className="bg-white border-b shadow-sm sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Niveau */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <FaGraduationCap className="text-gray-500" />
              Niveau
            </label>
            <select
              className="w-full border border-gray-300 bg-white px-3 py-2.5 rounded-lg shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
              value={levelId}
              onChange={e => { setLevelId(e.target.value); setSubjectId(""); setCourseId(""); }}
            >
              <option value="">Tous les niveaux</option>
              {levels.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          {/* Matière */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <FaLayerGroup className="text-gray-500" />
              Matière
            </label>
            <select
              className="w-full border border-gray-300 bg-white px-3 py-2.5 rounded-lg shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
              value={subjectId}
              onChange={e => { setSubjectId(e.target.value); setCourseId(""); }}
            >
              <option value="">Toutes les matières</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Cours */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <FaBook className="text-gray-500" />
              Cours
            </label>
            <select
              className="w-full border border-gray-300 bg-white px-3 py-2.5 rounded-lg shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
              value={courseId}
              onChange={e => setCourseId(e.target.value)}
            >
              <option value="">Tous les cours</option>
              {filteredCourses.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}