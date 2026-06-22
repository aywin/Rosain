import { db } from "@/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import type { Group, Assignment, Submission, TeacherContent, QuizAnswerItem } from "@/type/teacher";

// ── Groups ────────────────────────────────────────────────────────────────────

export async function createGroup(teacherId: string, name: string): Promise<string> {
  const ref = await addDoc(collection(db, "groups"), {
    name,
    teacherId,
    studentIds: [],
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getTeacherGroups(teacherId: string): Promise<Group[]> {
  const q = query(collection(db, "groups"), where("teacherId", "==", teacherId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Group));
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const snap = await getDoc(doc(db, "groups", groupId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Group;
}

export async function renameGroup(groupId: string, name: string): Promise<void> {
  await updateDoc(doc(db, "groups", groupId), { name });
}

export async function deleteGroup(groupId: string): Promise<void> {
  await deleteDoc(doc(db, "groups", groupId));
}

export async function addStudentToGroup(groupId: string, studentId: string): Promise<void> {
  await updateDoc(doc(db, "groups", groupId), { studentIds: arrayUnion(studentId) });
}

export async function removeStudentFromGroup(groupId: string, studentId: string): Promise<void> {
  await updateDoc(doc(db, "groups", groupId), { studentIds: arrayRemove(studentId) });
}

export async function findUserByEmail(email: string): Promise<{ uid: string; nom: string; prenom: string; email: string } | null> {
  const q = query(collection(db, "users"), where("email", "==", email));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  const data = d.data();
  return { uid: d.id, nom: data.nom || "", prenom: data.prenom || "", email: data.email || "" };
}

// ── Assignments ───────────────────────────────────────────────────────────────

export async function createAssignment(data: Omit<Assignment, "id" | "createdAt">): Promise<string> {
  const clean: Record<string, any> = { createdAt: serverTimestamp() };
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) clean[k] = v;
  }
  // questions array must not be undefined — store empty array if absent
  if (!clean.questions) clean.questions = [];
  const ref = await addDoc(collection(db, "assignments"), clean);
  return ref.id;
}

export async function getGroupAssignments(groupId: string): Promise<Assignment[]> {
  const q = query(collection(db, "assignments"), where("groupId", "==", groupId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Assignment));
}

export async function getStudentAssignments(studentId: string): Promise<Assignment[]> {
  const q = query(collection(db, "groups"), where("studentIds", "array-contains", studentId));
  const groupSnap = await getDocs(q);
  if (groupSnap.empty) return [];
  const groupIds = groupSnap.docs.map((d) => d.id);
  const allAssignments: Assignment[] = [];
  for (let i = 0; i < groupIds.length; i += 30) {
    const batch = groupIds.slice(i, i + 30);
    const aSnap = await getDocs(
      query(collection(db, "assignments"), where("groupId", "in", batch))
    );
    aSnap.docs.forEach((d) => allAssignments.push({ id: d.id, ...d.data() } as Assignment));
  }
  return allAssignments;
}

export async function deleteAssignment(assignmentId: string): Promise<void> {
  await deleteDoc(doc(db, "assignments", assignmentId));
}

// ── Submissions ───────────────────────────────────────────────────────────────

export async function getOrCreateSubmission(
  assignmentId: string,
  studentId: string,
  groupId: string
): Promise<Submission> {
  const id = `${studentId}_${assignmentId}`;
  const ref = doc(db, "submissions", id);
  const snap = await getDoc(ref);
  if (snap.exists()) return { id: snap.id, ...snap.data() } as Submission;
  const { setDoc } = await import("firebase/firestore");
  const newSub = { assignmentId, studentId, groupId, status: "not_started" as const, createdAt: serverTimestamp() };
  await setDoc(ref, newSub);
  return { id, ...newSub };
}

export async function submitWork(
  assignmentId: string,
  studentId: string,
  textContent: string,
  quizAnswers?: QuizAnswerItem[],
  fileUrl?: string,
  fileName?: string
): Promise<void> {
  const id = `${studentId}_${assignmentId}`;
  const { setDoc } = await import("firebase/firestore");
  const payload: Record<string, any> = {
    assignmentId,
    studentId,
    status: "submitted",
    textContent,
    submittedAt: serverTimestamp(),
  };
  if (quizAnswers && quizAnswers.length > 0) payload.quizAnswers = quizAnswers;
  if (fileUrl) payload.fileUrl = fileUrl;
  if (fileName) payload.fileName = fileName;
  await setDoc(doc(db, "submissions", id), payload, { merge: true });
}

export async function saveQuizAnswers(
  assignmentId: string,
  studentId: string,
  groupId: string,
  quizAnswers: QuizAnswerItem[]
): Promise<void> {
  const id = `${studentId}_${assignmentId}`;
  const { setDoc } = await import("firebase/firestore");
  await setDoc(
    doc(db, "submissions", id),
    { assignmentId, studentId, groupId, quizAnswers, quizSubmittedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function getAssignmentSubmissions(assignmentId: string): Promise<Submission[]> {
  const q = query(collection(db, "submissions"), where("assignmentId", "==", assignmentId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Submission));
}

export async function getGroupSubmissions(groupId: string): Promise<Submission[]> {
  const q = query(collection(db, "submissions"), where("groupId", "==", groupId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Submission));
}

export async function getStudentSubmissions(studentId: string): Promise<Submission[]> {
  const q = query(collection(db, "submissions"), where("studentId", "==", studentId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Submission));
}

export async function saveCorrection(
  assignmentId: string,
  studentId: string,
  grade: number,
  feedback: string
): Promise<void> {
  const id = `${studentId}_${assignmentId}`;
  const { setDoc } = await import("firebase/firestore");
  await setDoc(
    doc(db, "submissions", id),
    { grade, feedback, status: "corrected", correctedAt: serverTimestamp() },
    { merge: true }
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export async function getStudentGroupsInfo(studentId: string): Promise<Group[]> {
  const q = query(collection(db, "groups"), where("studentIds", "array-contains", studentId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Group));
}

export async function updateSubmissionStatus(
  assignmentId: string,
  studentId: string,
  groupId: string,
  status: "in_progress" | "submitted"
): Promise<void> {
  const id = `${studentId}_${assignmentId}`;
  const { setDoc } = await import("firebase/firestore");
  await setDoc(
    doc(db, "submissions", id),
    { assignmentId, studentId, groupId, status, ...(status === "submitted" ? { submittedAt: serverTimestamp() } : {}) },
    { merge: true }
  );
}

// ── Teacher Content (ressources enseignant) ───────────────────────────────────

export async function createTeacherContent(data: Omit<TeacherContent, "id" | "createdAt">): Promise<string> {
  const clean: Record<string, any> = { createdAt: serverTimestamp() };
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) clean[k] = v;
  }
  const ref = await addDoc(collection(db, "teacherContent"), clean);
  return ref.id;
}

export async function getTeacherContent(teacherId: string): Promise<TeacherContent[]> {
  const q = query(collection(db, "teacherContent"), where("teacherId", "==", teacherId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TeacherContent));
}

export async function updateTeacherContent(id: string, data: Partial<TeacherContent>): Promise<void> {
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) clean[k] = v;
  }
  await updateDoc(doc(db, "teacherContent", id), clean);
}

export async function deleteTeacherContent(id: string): Promise<void> {
  await deleteDoc(doc(db, "teacherContent", id));
}

// ── Teacher Dashboard Stats ──────────────────────────────────────────────────

export async function getTeacherDashboardData(teacherId: string) {
  const groups = await getTeacherGroups(teacherId);
  if (groups.length === 0) return { groups, assignments: [], submissions: [] };

  const groupIds = groups.map((g) => g.id);
  const allAssignments: Assignment[] = [];
  const allSubmissions: Submission[] = [];

  for (let i = 0; i < groupIds.length; i += 30) {
    const batch = groupIds.slice(i, i + 30);
    const [aSnap, sSnap] = await Promise.all([
      getDocs(query(collection(db, "assignments"), where("groupId", "in", batch))),
      getDocs(query(collection(db, "submissions"), where("groupId", "in", batch))),
    ]);
    aSnap.docs.forEach((d) => allAssignments.push({ id: d.id, ...d.data() } as Assignment));
    sSnap.docs.forEach((d) => allSubmissions.push({ id: d.id, ...d.data() } as Submission));
  }
  return { groups, assignments: allAssignments, submissions: allSubmissions };
}
