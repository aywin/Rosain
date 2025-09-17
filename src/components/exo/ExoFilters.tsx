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

  const selectClass = "flex items-center gap-1 border border-gray-300 bg-white px-3 py-2 rounded-lg shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-sm";

  return (
    <div className="flex flex-wrap gap-4 mb-6 justify-center">
      {/* Niveaux */}
      <div className="flex items-center gap-2">
        <FaGraduationCap className="text-gray-500" />
        <select
          className={selectClass}
          value={levelId}
          onChange={e => { setLevelId(e.target.value); setSubjectId(""); setCourseId(""); }}
        >
          <option value="">Tous niveaux</option>
          {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>

      {/* Matières */}
      <div className="flex items-center gap-2">
        <FaLayerGroup className="text-gray-500" />
        <select
          className={selectClass}
          value={subjectId}
          onChange={e => { setSubjectId(e.target.value); setCourseId(""); }}
        >
          <option value="">Toutes matières</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Cours */}
      <div className="flex items-center gap-2">
        <FaBook className="text-gray-500" />
        <select
          className={selectClass}
          value={courseId}
          onChange={e => setCourseId(e.target.value)}
        >
          <option value="">Tous cours</option>
          {filteredCourses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>
    </div>
  );
}
