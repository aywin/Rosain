import { NextResponse } from "next/server";
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    }),
  });
}

export async function POST(req: Request) {
  try {
    const { uid } = await req.json();

    if (!uid) {
      return NextResponse.json({ error: "UID manquant" }, { status: 400 });
    }

    // Supprime l'utilisateur dans Firebase Auth
    await admin.auth().deleteUser(uid);

    // Supprime le document Firestore
    await admin.firestore().collection("users").doc(uid).delete();

    return NextResponse.json({ message: "Utilisateur supprimé avec succès" });
  } catch (err: any) {
    console.error("Erreur suppression :", err);
    return NextResponse.json(
      { error: "Erreur lors de la suppression", details: err.message },
      { status: 500 }
    );
  }
}
