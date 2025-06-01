// src/components/auth/SignUpPage.jsx
import React, { useState } from "react";
import {
  Paper,
  Title,
  TextInput,
  Button,
  Group,
  Text,
  Anchor,
} from "@mantine/core";
import { IconUser, IconAt, IconLock } from "@tabler/icons-react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../firebase"; // Ensure this path is correct
import { useAuth } from "../../contexts/AuthContext"; // Ensure this path is correct

export default function SignUpPage({ onSwitchToSignIn, onSignUpSuccess }) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuthError } = useAuth();

  const createUserProfileDocument = async (user, additionalData = {}) => {
    if (!user) return;
    const userDocRef = doc(db, "users", user.uid);
    const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || additionalData.displayName || "New User",
      createdAt: serverTimestamp(),
      familyId: null, // Initialize familyId as null
      ...additionalData,
    };
    try {
      await setDoc(userDocRef, userData);
    } catch (profileError) {
      console.error("Error creating user profile:", profileError);
      // Potentially set an error state here
    }
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    setError("");
    setAuthError("");
    setLoading(true);
    if (password.length < 6) {
      setError("Password should be at least 6 characters.");
      setLoading(false);
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      await updateProfile(userCredential.user, { displayName: displayName });
      await createUserProfileDocument(userCredential.user, { displayName });
      // onSignUpSuccess will be called by AuthContext detecting user change
    } catch (err) {
      console.error("Sign up error:", err);
      setError(err.message);
      setAuthError(err.message);
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setAuthError("");
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const userCredential = await signInWithPopup(auth, provider);
      // Check if profile needs to be created (Firebase handles this for Google, but we want our familyId field)
      await createUserProfileDocument(userCredential.user);
      // onSignUpSuccess will be called by AuthContext detecting user change
    } catch (err) {
      console.error("Google sign in error:", err);
      setError(err.message);
      setAuthError(err.message);
    }
    setLoading(false);
  };

  return (
    <Paper
      withBorder
      shadow="md"
      p={30}
      mt={30}
      radius="md"
      style={{ maxWidth: 420, margin: "auto" }}
    >
      <Title ta="center" order={2} mb="xl">
        Create Account
      </Title>
      {error && (
        <Text color="red" ta="center" mb="md">
          {error}
        </Text>
      )}
      <form onSubmit={handleEmailSignUp}>
        <TextInput
          label="Display Name"
          placeholder="Your Name"
          required
          leftSection={<IconUser size={16} />}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          mb="md"
        />
        <TextInput
          label="Email"
          placeholder="you@mantine.dev"
          required
          leftSection={<IconAt size={16} />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          mb="md"
        />
        <TextInput
          type="password"
          label="Password"
          placeholder="Your password (min. 6 characters)"
          required
          leftSection={<IconLock size={16} />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          mb="lg"
        />
        <Button type="submit" fullWidth loading={loading}>
          Sign Up
        </Button>
      </form>
      <Text ta="center" mt="md" mb="md">
        or
      </Text>
      <Button
        fullWidth
        variant="default"
        onClick={handleGoogleSignIn}
        loading={loading}
      >
        Sign Up with Google
      </Button>
      <Text c="dimmed" size="sm" ta="center" mt="lg">
        Already have an account?{" "}
        <Anchor component="button" size="sm" onClick={onSwitchToSignIn}>
          Sign In
        </Anchor>
      </Text>
    </Paper>
  );
}
