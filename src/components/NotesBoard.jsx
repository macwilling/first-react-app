// src/components/NotesBoard.jsx
import React, { useState, useEffect } from "react";
import {
  Paper,
  Title,
  Button,
  Group,
  Modal,
  TextInput,
  Stack,
  ActionIcon,
  Text,
  SimpleGrid,
  Card,
  Textarea,
  ColorInput,
  LoadingOverlay,
  Alert,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconPlus,
  IconTrash,
  IconPencil,
  IconAlertCircle,
} from "@tabler/icons-react";
import { db } from "../firebase"; // Your Firebase config
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

const NOTES_COLLECTION = "notes";

const MANTINE_COLORS = [
  "var(--mantine-color-gray-3)",
  "var(--mantine-color-red-3)",
  "var(--mantine-color-pink-3)",
  "var(--mantine-color-grape-3)",
  "var(--mantine-color-violet-3)",
  "var(--mantine-color-indigo-3)",
  "var(--mantine-color-blue-3)",
  "var(--mantine-color-cyan-3)",
  "var(--mantine-color-teal-3)",
  "var(--mantine-color-green-3)",
  "var(--mantine-color-lime-3)",
  "var(--mantine-color-yellow-3)",
  "var(--mantine-color-orange-3)",
];

export default function NotesBoard() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [opened, { open, close }] = useDisclosure(false);
  const [editingNote, setEditingNote] = useState(null); // Full note object for editing
  const [newNote, setNewNote] = useState({
    title: "",
    content: "",
    color: MANTINE_COLORS[0],
  });

  // Fetch Notes from Firestore
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, NOTES_COLLECTION),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const notesData = [];
        querySnapshot.forEach((doc) => {
          notesData.push({ ...doc.data(), id: doc.id });
        });
        setNotes(notesData);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching notes: ", err);
        setError("Failed to load notes.");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleOpenModal = (noteToEdit = null) => {
    if (noteToEdit) {
      setEditingNote(noteToEdit);
      setNewNote({
        title: noteToEdit.title,
        content: noteToEdit.content,
        color: noteToEdit.color,
      });
    } else {
      setEditingNote(null);
      setNewNote({
        title: "",
        content: "",
        color:
          MANTINE_COLORS[Math.floor(Math.random() * MANTINE_COLORS.length)],
      });
    }
    open();
  };

  const handleSubmitNote = async () => {
    if (!newNote.title.trim() && !newNote.content.trim()) {
      setError("Note title or content cannot be empty.");
      return;
    }
    setLoading(true);
    setError(null);
    const notePayload = {
      title: newNote.title,
      content: newNote.content,
      color: newNote.color,
    };

    try {
      if (editingNote) {
        const noteRef = doc(db, NOTES_COLLECTION, editingNote.id);
        await updateDoc(noteRef, notePayload);
      } else {
        await addDoc(collection(db, NOTES_COLLECTION), {
          ...notePayload,
          createdAt: serverTimestamp(),
        });
      }
      close();
    } catch (err) {
      console.error("Error saving note: ", err);
      setError("Failed to save note.");
    }
    setLoading(false);
  };

  const deleteNote = async (noteId) => {
    if (window.confirm("Are you sure you want to delete this note?")) {
      setLoading(true);
      setError(null);
      try {
        await deleteDoc(doc(db, NOTES_COLLECTION, noteId));
      } catch (err) {
        console.error("Error deleting note: ", err);
        setError("Failed to delete note.");
      }
      setLoading(false);
    }
  };

  return (
    <Paper
      shadow="md"
      p="lg"
      radius="md"
      withBorder
      style={{ position: "relative" }}
    >
      <LoadingOverlay
        visible={loading && !error}
        overlayProps={{ radius: "sm", blur: 2 }}
      />
      {error && (
        <Alert
          icon={<IconAlertCircle size="1rem" />}
          title="Error"
          color="red"
          withCloseButton
          onClose={() => setError(null)}
          m="md"
        >
          {error}
        </Alert>
      )}
      <Modal
        opened={opened}
        onClose={close}
        title={editingNote ? "Edit Note" : "Add New Note"}
        centered
      >
        <Stack>
          <TextInput
            label="Note Title"
            placeholder="e.g., Important Reminder"
            value={newNote.title}
            onChange={(e) =>
              setNewNote({ ...newNote, title: e.currentTarget.value })
            }
            data-autofocus
          />
          <Textarea
            label="Content"
            placeholder="Write your note here..."
            value={newNote.content}
            onChange={(e) =>
              setNewNote({ ...newNote, content: e.currentTarget.value })
            }
            minRows={4}
          />
          <ColorInput
            label="Note Color"
            placeholder="Pick a color"
            value={newNote.color}
            onChange={(value) => setNewNote({ ...newNote, color: value })}
            swatches={MANTINE_COLORS}
            format="hex"
          />
          <Button
            onClick={handleSubmitNote}
            fullWidth
            mt="md"
            loading={loading}
          >
            {editingNote ? "Save Changes" : "Add Note"}
          </Button>
        </Stack>
      </Modal>

      <Group justify="space-between" mb="xl">
        <Title order={2}>Notes Board</Title>
        <Button
          onClick={() => handleOpenModal()}
          leftSection={<IconPlus size={18} />}
        >
          New Note
        </Button>
      </Group>

      {notes.length > 0 ? (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
          {notes.map((note) => (
            <Card
              key={note.id}
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
              style={{ backgroundColor: note.color }}
            >
              <Card.Section
                withBorder
                inheritPadding
                py="xs"
                style={{ borderColor: "rgba(0,0,0,0.1)" }}
              >
                <Group justify="space-between">
                  <Text fw={500} truncate>
                    {note.title || "Untitled Note"}
                  </Text>
                  <Group gap="xs">
                    <ActionIcon
                      variant="subtle"
                      color="dark"
                      onClick={() => handleOpenModal(note)}
                      title="Edit note"
                    >
                      <IconPencil size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="dark"
                      onClick={() => deleteNote(note.id)}
                      title="Delete note"
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Card.Section>
              <Text mt="sm" size="sm" style={{ whiteSpace: "pre-wrap" }}>
                {note.content}
              </Text>
            </Card>
          ))}
        </SimpleGrid>
      ) : !loading ? (
        <Text c="dimmed" ta="center" mt="xl">
          No notes yet. Add some to get started!
        </Text>
      ) : null}
    </Paper>
  );
}
