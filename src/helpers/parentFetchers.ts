// src/helpers/parentFetchers.ts
import { db } from "@/firebase";
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    arrayUnion,
    addDoc,
    serverTimestamp,
} from "firebase/firestore";

const BATCH_SIZE = 30;

// ─────────────────────────────────────────────
// 1. Résoudre les pendingChildrenEmails → linkedStudents
//    À appeler au login si role === "parent" ou "tuteur"
// ─────────────────────────────────────────────
export async function resolvePendingChildren(parentId: string): Promise<void> {
    const parentRef = doc(db, "users", parentId);
    const parentSnap = await getDoc(parentRef);
    if (!parentSnap.exists()) return;

    const data = parentSnap.data();
    const pending: string[] = data.pendingChildrenEmails || [];
    if (pending.length === 0) return;

    const resolved: string[] = [];
    const stillPending: string[] = [];

    // Chercher chaque email en parallèle (batches de BATCH_SIZE)
    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
        const batch = pending.slice(i, i + BATCH_SIZE);
        const q = query(collection(db, "users"), where("email", "in", batch));
        const snap = await getDocs(q);
        snap.docs.forEach((d) => resolved.push(d.id));
        const foundEmails = snap.docs.map((d) => d.data().email);
        batch.forEach((email) => {
            if (!foundEmails.includes(email)) stillPending.push(email);
        });
    }

    if (resolved.length === 0) return;

    // Mettre à jour le parent : ajouter les UIDs résolus, vider les emails résolus
    await updateDoc(parentRef, {
        linkedStudents: arrayUnion(...resolved),
        pendingChildrenEmails: stillPending,
    });
}

// ─────────────────────────────────────────────
// 2. Récupérer les infos de base des enfants liés
// ─────────────────────────────────────────────
export interface ChildInfo {
    uid: string;
    nom: string;
    prenom: string;
    email: string;
    lastLogin?: Date | null;
}

export async function getLinkedChildren(parentId: string): Promise<ChildInfo[]> {
    const parentSnap = await getDoc(doc(db, "users", parentId));
    if (!parentSnap.exists()) return [];

    const linkedStudents: string[] = parentSnap.data().linkedStudents || [];
    if (linkedStudents.length === 0) return [];

    const children: ChildInfo[] = [];

    for (let i = 0; i < linkedStudents.length; i += BATCH_SIZE) {
        const batch = linkedStudents.slice(i, i + BATCH_SIZE);
        const q = query(collection(db, "users"), where("__name__", "in", batch));
        const snap = await getDocs(q);
        snap.docs.forEach((d) => {
            const data = d.data();
            children.push({
                uid: d.id,
                nom: data.nom || "",
                prenom: data.prenom || "",
                email: data.email || "",
                lastLogin: data.lastLogin?.toDate?.() || null,
            });
        });
    }

    return children;
}

// ─────────────────────────────────────────────
// 3. Progression cours d'un enfant
// ─────────────────────────────────────────────
export interface ChildCourseProgress {
    courseId: string;
    status: "not_started" | "in_progress" | "done";
    updatedAt: Date | null;
}

export async function getChildCourseProgress(childId: string): Promise<ChildCourseProgress[]> {
    const q = query(collection(db, "progress"), where("id_user", "==", childId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
        const data = d.data();
        return {
            courseId: data.id_course || "",
            status: data.status || "not_started",
            updatedAt: data.updatedAt?.toDate?.() || null,
        };
    });
}

// ─────────────────────────────────────────────
// 4. Progression vidéos agrégée d'un enfant
// ─────────────────────────────────────────────
export interface ChildVideoSummary {
    totalVideos: number;
    completedVideos: number;
    totalMinutesWatched: number;
    lastActivity: Date | null;
}

export async function getChildVideoSummary(childId: string): Promise<ChildVideoSummary> {
    const q = query(collection(db, "videoProgress"), where("userId", "==", childId));
    const snap = await getDocs(q);

    let completedVideos = 0;
    let totalMinutesWatched = 0;
    let lastActivity: Date | null = null;

    snap.docs.forEach((d) => {
        const data = d.data();
        if (data.completed) completedVideos++;
        totalMinutesWatched += data.minutesWatched || 0;
        const updated = data.updatedAt?.toDate?.();
        if (updated && (!lastActivity || updated > lastActivity)) lastActivity = updated;
    });

    return {
        totalVideos: snap.size,
        completedVideos,
        totalMinutesWatched: Math.round(totalMinutesWatched),
        lastActivity,
    };
}

// ─────────────────────────────────────────────
// 5. Quota IA d'un enfant
// ─────────────────────────────────────────────
export interface ChildQuotaSummary {
    plan: string;
    exoAssistantUsed: number;
    exoAssistantLimit: number;
    videoAssistantUsed: number;
    videoAssistantLimit: number;
}

export async function getChildQuotaSummary(childId: string): Promise<ChildQuotaSummary | null> {
    const snap = await getDoc(doc(db, "quotas", childId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
        plan: data.plan || "gratuit",
        exoAssistantUsed: data.usage_today?.exo_assistant || 0,
        exoAssistantLimit: data.daily_limits?.exo_assistant || 5,
        videoAssistantUsed: data.usage_today?.video_assistant || 0,
        videoAssistantLimit: data.daily_limits?.video_assistant || 10,
    };
}

// ─────────────────────────────────────────────
// 6. Tout en une seule passe pour un enfant
// ─────────────────────────────────────────────
export interface ChildFullData {
    info: ChildInfo;
    courseProgress: ChildCourseProgress[];
    videoSummary: ChildVideoSummary;
    quota: ChildQuotaSummary | null;
}

export async function getChildFullData(child: ChildInfo): Promise<ChildFullData> {
    const [courseProgress, videoSummary, quota] = await Promise.all([
        getChildCourseProgress(child.uid),
        getChildVideoSummary(child.uid),
        getChildQuotaSummary(child.uid),
    ]);
    return { info: child, courseProgress, videoSummary, quota };
}

// ─────────────────────────────────────────────
// 7. LinkRequests — demandes de liaison en attente
// ─────────────────────────────────────────────
export interface LinkRequest {
    id: string;
    parentId: string;
    childId: string;
    childEmail: string;
    childName: string;
    status: "pending" | "confirmed" | "rejected";
    createdAt: Date | null;
}

export async function getPendingLinkRequests(parentId: string): Promise<LinkRequest[]> {
    const q = query(
        collection(db, "linkRequests"),
        where("parentId", "==", parentId),
        where("status", "==", "pending")
    );
    const snap = await getDocs(q);

    // Enrichir avec le nom de l'enfant depuis son doc user
    const requests = await Promise.all(
        snap.docs.map(async (d) => {
            const data = d.data();
            let childName = data.childName || "";
            if (!childName && data.childId) {
                const childSnap = await getDoc(doc(db, "users", data.childId));
                if (childSnap.exists()) {
                    const cd = childSnap.data();
                    childName = `${cd.prenom || ""} ${cd.nom || ""}`.trim();
                }
            }
            return {
                id: d.id,
                parentId: data.parentId,
                childId: data.childId,
                childEmail: data.childEmail,
                childName,
                status: data.status,
                createdAt: data.createdAt?.toDate?.() || null,
            } as LinkRequest;
        })
    );

    return requests;
}

export async function confirmLinkRequest(
    requestId: string,
    parentId: string,
    childId: string,
    childEmail: string
): Promise<void> {
    const parentRef = doc(db, "users", parentId);
    const requestRef = doc(db, "linkRequests", requestId);

    await Promise.all([
        // Lier l'enfant
        updateDoc(parentRef, {
            linkedStudents: arrayUnion(childId),
            // Retirer l'email des pending
            pendingChildrenEmails: (await getDoc(parentRef).then((s) =>
                (s.data()?.pendingChildrenEmails || []).filter((e: string) => e !== childEmail)
            )),
        }),
        // Marquer la demande comme confirmée
        updateDoc(requestRef, { status: "confirmed" }),
    ]);
}

export async function rejectLinkRequest(requestId: string): Promise<void> {
    await updateDoc(doc(db, "linkRequests", requestId), { status: "rejected" });
}