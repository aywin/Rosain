"use client";

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
    <div className="flex flex-wrap gap-2 mb-6">
      {/* Niveaux */}
      <select
        className="border px-2 py-1 rounded"
        value={levelId}
        onChange={e => { setLevelId(e.target.value); setSubjectId(""); setCourseId(""); }}
      >
        <option value="">Tous niveaux</option>
        {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>

      {/* Matières */}
      <select
        className="border px-2 py-1 rounded"
        value={subjectId}
        onChange={e => { setSubjectId(e.target.value); setCourseId(""); }}
      >
        <option value="">Toutes matières</option>
        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      {/* Cours */}
      <select
        className="border px-2 py-1 rounded"
        value={courseId}
        onChange={e => setCourseId(e.target.value)}
      >
        <option value="">Tous cours</option>
        {filteredCourses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
      </select>
    </div>
  );
}
