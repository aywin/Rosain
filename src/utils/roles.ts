// Normalise le rôle stocké en Firestore (peut être "tuteur", "Tuteur/Prof", etc.)
export function isTeacher(role: string | null | undefined): boolean {
  if (!role) return false;
  const r = role.trim().toLowerCase();
  return r === "tuteur" || r === "tuteur/prof" || r === "teacher";
}

export function isSuperAdmin(role: string | null | undefined): boolean {
  return role?.trim().toLowerCase() === "superadmin";
}

export function isStudent(role: string | null | undefined): boolean {
  if (!role) return false;
  const r = role.trim().toLowerCase();
  return r === "student" || r === "eleve" || r === "élève";
}

export function isParent(role: string | null | undefined): boolean {
  return role?.trim().toLowerCase() === "parent";
}
