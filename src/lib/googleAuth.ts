import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut
} from "firebase/auth";

let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const WORKSPACE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/tasks.readonly",
  "https://www.googleapis.com/auth/tasks",
  "https://www.googleapis.com/auth/youtube.readonly"
];

async function getFirebaseConfig() {
  const res = await fetch("/api/apps/google/config");
  if (!res.ok) throw new Error("Could not load Firebase configuration");
  return res.json();
}

let authPromise: Promise<ReturnType<typeof getAuth>> | null = null;

export async function getFirebaseAuth() {
  if (!authPromise) {
    authPromise = (async () => {
      const config = await getFirebaseConfig();
      const app = getApps().length ? getApp() : initializeApp(config);
      return getAuth(app);
    })();
  }
  return authPromise;
}

export function getCachedToken(): string | null {
  return cachedAccessToken;
}

export const initAuth = async (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  try {
    const auth = await getFirebaseAuth();
    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential?.accessToken) {
            cachedAccessToken = credential.accessToken;
            await fetch("/api/apps/google/session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: result.user.email,
                displayName: result.user.displayName,
                accessToken: cachedAccessToken,
                scope: WORKSPACE_SCOPES.join(" ")
              })
            }).catch(() => {});
            if (onAuthSuccess) onAuthSuccess(result.user, cachedAccessToken);
          }
        }
      })
      .catch(() => {});

    return onAuthStateChanged(auth, async (user: User | null) => {
      if (user && cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (user && !cachedAccessToken) {
        // User is logged in via Firebase Auth, attempt to generate or use existing session token
        user.getIdToken().then(async (idToken) => {
          cachedAccessToken = idToken; // fallback bearer token
          if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
        }).catch(() => {
          if (onAuthFailure) onAuthFailure();
        });
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    });
  } catch (e) {
    console.error("initAuth error:", e);
    if (onAuthFailure) onAuthFailure();
    return () => {};
  }
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  isSigningIn = true;
  try {
    const auth = await getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    for (const scope of WORKSPACE_SCOPES) {
      provider.addScope(scope);
    }
    provider.setCustomParameters({ prompt: "consent" });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to get Google access token from sign-in");
    }

    cachedAccessToken = credential.accessToken;

    // Sync session with OmniMind backend
    await fetch("/api/apps/google/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: result.user.email,
        displayName: result.user.displayName,
        accessToken: cachedAccessToken,
        scope: WORKSPACE_SCOPES.join(" ")
      })
    }).catch(err => console.warn("Failed to notify backend of Google session:", err));

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (
      error?.code === "auth/popup-closed-by-user" ||
      error?.code === "auth/cancelled-popup-request"
    ) {
      return null;
    }
    if (error?.code === "auth/popup-blocked") {
      try {
        const auth = await getFirebaseAuth();
        const provider = new GoogleAuthProvider();
        for (const scope of WORKSPACE_SCOPES) {
          provider.addScope(scope);
        }
        provider.setCustomParameters({ prompt: "consent" });
        await signInWithRedirect(auth, provider);
        return null;
      } catch (redirectErr) {
        console.error("Redirect sign-in failed:", redirectErr);
        throw redirectErr;
      }
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const googleSignOut = async () => {
  try {
    const auth = await getFirebaseAuth();
    await signOut(auth);
    cachedAccessToken = null;
    await fetch("/api/apps/google/disconnect", { method: "POST" }).catch(() => {});
  } catch (e) {
    console.error("googleSignOut error:", e);
  }
};
