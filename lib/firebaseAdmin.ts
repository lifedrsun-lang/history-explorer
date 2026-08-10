import "server-only";

import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

class FirebaseAdminConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FirebaseAdminConfigurationError";
  }
}

const getRequiredEnv = (name: string) => {
  const value = process.env[name];

  if (!value) {
    throw new FirebaseAdminConfigurationError(
      `Missing Firebase Admin environment variable: ${name}`
    );
  }

  return value;
};

const getAdminApp = () => {
  if (getApps().length > 0) {
    return getApp();
  }

  const projectId = getRequiredEnv("FIREBASE_ADMIN_PROJECT_ID");
  const clientEmail = getRequiredEnv("FIREBASE_ADMIN_CLIENT_EMAIL");
  const privateKey = getRequiredEnv("FIREBASE_ADMIN_PRIVATE_KEY").replace(
    /\\n/g,
    "\n"
  );
  const storageBucket = getRequiredEnv("FIREBASE_ADMIN_STORAGE_BUCKET");

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    storageBucket,
  });
};

export const isFirebaseAdminConfigurationError = (error: unknown) => {
  return error instanceof FirebaseAdminConfigurationError;
};

export const getFirebaseAdmin = () => {
  const app = getAdminApp();

  return {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
    bucket: getStorage(app).bucket(
      getRequiredEnv("FIREBASE_ADMIN_STORAGE_BUCKET")
    ),
  };
};
