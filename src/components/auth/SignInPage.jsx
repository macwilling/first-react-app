// src/components/auth/SignInPage.jsx
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
import { IconAt, IconLock } from "@tabler/icons-react";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../../firebase"; // Ensure this path is correct
import { useAuth } from "../../contexts/AuthContext"; // Ensure this path is correct

// You'll need to handle navigation, likely from App.jsx passing down a setter or using a routing library
export default function SignInPage({ onSwitchToSignUp, onSignInSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuthError } = useAuth();

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setError("");
    setAuthError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onSignInSuccess will be called by AuthContext detecting user change
    } catch (err) {
      console.error("Sign in error:", err);
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
      await signInWithPopup(auth, provider);
      // onSignInSuccess will be called by AuthContext detecting user change
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
        Welcome back!
      </Title>
      {error && (
        <Text color="red" ta="center" mb="md">
          {error}
        </Text>
      )}
      <form onSubmit={handleEmailSignIn}>
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
          placeholder="Your password"
          required
          leftSection={<IconLock size={16} />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          mb="lg"
        />
        <Button type="submit" fullWidth loading={loading}>
          Sign In
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
        Sign In with Google
      </Button>
      <Text c="dimmed" size="sm" ta="center" mt="lg">
        Don't have an account?{" "}
        <Anchor component="button" size="sm" onClick={onSwitchToSignUp}>
          Sign Up
        </Anchor>
      </Text>
    </Paper>
  );
}
