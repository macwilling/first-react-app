// src/components/auth/FamilyOnboardingPage.jsx
import React, { useState } from "react";
import {
  Paper,
  Title,
  TextInput,
  Button,
  Text,
  Alert,
  Stack,
  Divider,
} from "@mantine/core";
import { IconUsers, IconTicket } from "@tabler/icons-react";
import {
  doc,
  setDoc,
  getDoc,
  writeBatch,
  serverTimestamp,
  collection,
  addDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";

export default function FamilyOnboardingPage() {
  const { currentUser, userProfile, setAuthError } = useAuth();
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingJoin, setLoadingJoin] = useState(false);
  const [error, setError] = useState("");

  const handleCreateFamily = async (e) => {
    e.preventDefault();
    if (!familyName.trim()) {
      setError("Family name cannot be empty.");
      return;
    }
    setError("");
    setAuthError("");
    setLoadingCreate(true);

    try {
      // Create a new family document
      const familyData = {
        name: familyName.trim(),
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        members: {
          // Add the current user to the members map
          [currentUser.uid]: true, // Or a role, e.g., 'admin'
        },
      };

      const familyRef = await addDoc(collection(db, "families"), familyData); // Use the updated familyData

      // Update user profile with familyId
      const userDocRef = doc(db, "users", currentUser.uid);
      await setDoc(userDocRef, { familyId: familyRef.id }, { merge: true });

      // Optionally update UI or redirect here
      // Example: navigate to a dashboard or the family page
    } catch (err) {
      console.error("Error creating family:", err); // This is where your error is caught
      setError("Failed to create family. Please check console for details."); // More specific error for user
      setAuthError(err.message); // Set auth error if needed
    }

    setLoadingCreate(false);
  };

  const handleJoinFamily = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setError("Invite code cannot be empty.");
      return;
    }
    setError("");
    setAuthError("");
    setLoadingJoin(true);

    try {
      const familyDocRef = doc(db, "families", inviteCode.trim());
      const familySnap = await getDoc(familyDocRef);

      if (!familySnap.exists()) {
        setError("Family not found. Please check the invite code.");
        setLoadingJoin(false);
        return;
      }

      // Update user profile with familyId
      const userDocRef = doc(db, "users", currentUser.uid);
      await setDoc(
        userDocRef,
        { familyId: inviteCode.trim() },
        { merge: true }
      );

      // Optionally update UI or redirect here
    } catch (err) {
      console.error("Error joining family:", err);
      setError("Failed to join family.");
      setAuthError(err.message);
    }

    setLoadingJoin(false);
  };

  return (
    <Paper
      withBorder
      shadow="md"
      p={30}
      mt={30}
      radius="md"
      style={{ maxWidth: 480, margin: "auto" }}
    >
      <Title ta="center" order={2} mb="xl">
        Welcome to the Family!
      </Title>
      {error && (
        <Alert color="red" mb="md">
          {error}
        </Alert>
      )}
      <Stack spacing="lg">
        <form onSubmit={handleCreateFamily}>
          <Text fw={500} mb="xs">
            Create a new family group
          </Text>
          <TextInput
            label="Family Name"
            placeholder="The Johnsons"
            required
            icon={<IconUsers size={16} />}
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            mb="sm"
          />
          <Button type="submit" fullWidth loading={loadingCreate}>
            Create Family
          </Button>
        </form>

        <Divider label="or" labelPosition="center" />

        <form onSubmit={handleJoinFamily}>
          <Text fw={500} mb="xs">
            Join an existing family
          </Text>
          <TextInput
            label="Invite Code"
            placeholder="Paste your invite code"
            required
            icon={<IconTicket size={16} />}
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            mb="sm"
          />
          <Button
            type="submit"
            fullWidth
            variant="default"
            loading={loadingJoin}
          >
            Join Family
          </Button>
        </form>
      </Stack>
    </Paper>
  );
}
