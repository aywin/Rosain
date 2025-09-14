import { NextResponse } from "next/server";
import admin from "firebase-admin";

// Vérification des variables d'environnement
const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;

if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  throw new Error(
    "Les variables FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL ou FIREBASE_PRIVATE_KEY ne sont pas définies."
  );
}

// Initialisation sécurisée de Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"), // remplace les \n encodés par des retours à la ligne réels
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
