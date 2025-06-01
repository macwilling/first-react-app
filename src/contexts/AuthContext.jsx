// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase"; // Your firebase setup

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null); // Will store { familyId, displayName, email, ... }
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (user) => {
        setCurrentUser(user);
        if (user) {
          // Listen to user's profile document for real-time updates (like familyId changes)
          const userDocRef = doc(db, "users", user.uid);
          const unsubscribeProfile = onSnapshot(
            userDocRef,
            (docSnap) => {
              if (docSnap.exists()) {
                setUserProfile({ uid: user.uid, ...docSnap.data() });
              } else {
                // This case might happen briefly if profile creation is slightly delayed
                // or if the user document was somehow deleted.
                console.warn(`User profile for ${user.uid} not found.`);
                setUserProfile({ uid: user.uid }); // Basic profile
              }
              setLoadingAuth(false);
            },
            (error) => {
              console.error("Error fetching user profile:", error);
              setAuthError("Failed to load user profile.");
              setUserProfile({ uid: user.uid }); // Basic profile even on error
              setLoadingAuth(false);
            }
          );
          return () => unsubscribeProfile(); // Cleanup profile listener
        } else {
          setUserProfile(null);
          setLoadingAuth(false);
        }
      },
      (error) => {
        console.error("Auth state change error:", error);
        setAuthError("An error occurred during authentication.");
        setCurrentUser(null);
        setUserProfile(null);
        setLoadingAuth(false);
      }
    );

    return () => unsubscribeAuth(); // Cleanup auth listener
  }, []);

  const value = {
    currentUser,
    userProfile, // Contains familyId, displayName, etc.
    familyId: userProfile?.familyId || null,
    loadingAuth,
    authError,
    setAuthError, // To allow components to set auth-related errors
  };

  return (
    <AuthContext.Provider value={value}>
      {!loadingAuth && children}
    </AuthContext.Provider>
  );
}
