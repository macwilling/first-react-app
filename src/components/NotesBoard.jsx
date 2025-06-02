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
  ColorInput,
  LoadingOverlay,
  Alert,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { RichTextEditor } from "@mantine/tiptap";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  IconPlus,
  IconTrash,
  IconPencil,
  IconAlertCircle,
} from "@tabler/icons-react";
import { db } from "../firebase";
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
import { useAuth } from "../contexts/AuthContext";

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
  const { familyId } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [opened, { open, close }] = useDisclosure(false);
  const [editingNote, setEditingNote] = useState(null);
  const [newNote, setNewNote] = useState({
    title: "",
    content: "", // This will store HTML from the RichTextEditor
    color: MANTINE_COLORS[0],
  });

  const editor = useEditor({
    extensions: [StarterKit],
    content: newNote.content,
    onUpdate: ({ editor }) => {
      setNewNote((prev) => ({ ...prev, content: editor.getHTML() }));
    },
  });

  useEffect(() => {
    if (editor && opened) {
      // When modal opens, or content/editor changes, update editor
      if (editor.getHTML() !== (newNote.content || "")) {
        editor.commands.setContent(newNote.content || "");
      }
      // Optionally, try to focus the editor
      // if (!editor.isFocused) {
      //   editor.commands.focus();
      // }
    }
  }, [editor, newNote.content, opened]);

  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      setNotes([]);
      return;
    }
    setLoading(true);
    setError(null);
    const notesCollectionPath = `families/${familyId}/notes`;
    const q = query(
      collection(db, notesCollectionPath),
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
        console.error(`Error fetching notes for family ${familyId}: `, err);
        setError("Failed to load notes.");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [familyId]);

  const handleOpenModal = (noteToEdit = null) => {
    if (noteToEdit) {
      setEditingNote(noteToEdit);
      setNewNote({
        title: noteToEdit.title,
        content: noteToEdit.content, // HTML content
        color: noteToEdit.color,
      });
      // Content will be set in the editor by the useEffect [editor, newNote.content, opened]
    } else {
      setEditingNote(null);
      setNewNote({
        title: "",
        content: "", // Empty content for new note
        color:
          MANTINE_COLORS[Math.floor(Math.random() * MANTINE_COLORS.length)],
      });
    }
    open();
  };

  const handleSubmitNote = async () => {
    if (!familyId) {
      setError("Cannot save note: No family selected.");
      return;
    }
    // Content check can be more nuanced, as empty HTML might be "<p></p>"
    if (
      !newNote.title.trim() &&
      (!newNote.content || newNote.content === "<p></p>")
    ) {
      setError("Note title or content cannot be empty.");
      return;
    }
    setLoading(true);
    setError(null);
    const notesCollectionPath = `families/${familyId}/notes`;
    const notePayload = {
      title: newNote.title,
      content: newNote.content, // HTML content from editor
      color: newNote.color,
    };

    try {
      if (editingNote) {
        const noteRef = doc(db, notesCollectionPath, editingNote.id);
        await updateDoc(noteRef, notePayload);
      } else {
        await addDoc(collection(db, notesCollectionPath), {
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
    if (!familyId) {
      setError("Cannot delete note: No family selected.");
      return;
    }
    if (window.confirm("Are you sure you want to delete this note?")) {
      setLoading(true);
      setError(null);
      const noteDocPath = `families/${familyId}/notes/${noteId}`;
      try {
        await deleteDoc(doc(db, noteDocPath));
      } catch (err) {
        console.error("Error deleting note: ", err);
        setError("Failed to delete note.");
      }
      setLoading(false);
    }
  };

  if (!familyId && !loading) {
    return (
      <Paper p="lg" withBorder>
        <Text>Please create or join a family to use the notes board.</Text>
      </Paper>
    );
  }

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
        size="lg" // Increased size for better editor experience
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

          <RichTextEditor
            editor={editor}
            style={{
              minHeight: "250px", // Keep: This is working
              border: "1px dashed blue", // Keep: This is working
              // We'll let default display/flex behavior of children take over first
            }}
          >
            <RichTextEditor.Toolbar
              // REMOVE sticky and stickyOffset for now to simplify
              // sticky
              // stickyOffset={60}
              style={{
                border: "3px solid red", // Make toolbar very obvious
                minHeight: "40px", // Ensure it has some height
                padding: "5px", // Add some padding
                backgroundColor: "rgba(255, 230, 230, 0.5)", // Light red background
                // Remove zIndex and position:relative for now
              }}
            >
              {/* Your ControlGroups are fine here */}
              <RichTextEditor.ControlsGroup>
                <RichTextEditor.Bold />
                <RichTextEditor.Italic />
                <RichTextEditor.Underline />
                <RichTextEditor.Strikethrough />
                <RichTextEditor.ClearFormatting />
              </RichTextEditor.ControlsGroup>
              <RichTextEditor.ControlsGroup>
                <RichTextEditor.H1 />
                <RichTextEditor.H2 />
                <RichTextEditor.H3 />
                <RichTextEditor.BulletList />
                <RichTextEditor.OrderedList />
                <RichTextEditor.Blockquote />
              </RichTextEditor.ControlsGroup>
            </RichTextEditor.Toolbar>

            <RichTextEditor.Content
              style={{
                minHeight: "150px", // Ensure content area has min height
                border: "3px solid green", // Make content area very obvious
                padding: "10px", // Add some padding
                backgroundColor: "rgba(230, 255, 230, 0.5)", // Light green background
                // Remove flexGrow for now
              }}
            />
          </RichTextEditor>

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
          disabled={!familyId || loading}
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
              {/* Render HTML content safely */}
              <Text
                mt="sm"
                size="sm"
                style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                dangerouslySetInnerHTML={{ __html: note.content }}
              />
            </Card>
          ))}
        </SimpleGrid>
      ) : !loading && familyId ? (
        <Text c="dimmed" ta="center" mt="xl">
          No notes yet for this family. Add some to get started!
        </Text>
      ) : null}
    </Paper>
  );
}
