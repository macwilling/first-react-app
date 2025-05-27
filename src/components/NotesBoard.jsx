// src/components/NotesBoard.jsx
import { useState } from "react";
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
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus, IconTrash, IconPencil, IconNote } from "@tabler/icons-react";

const initialNotes = [
  {
    id: 1,
    title: "WiFi Password",
    content: "SuperSecret123!",
    color: "yellow.3",
  },
  {
    id: 2,
    title: "Emergency Contacts",
    content: "Mom: 555-1234\nDad: 555-5678",
    color: "pink.3",
  },
];

const MANTINE_COLORS = [
  "gray.3",
  "red.3",
  "pink.3",
  "grape.3",
  "violet.3",
  "indigo.3",
  "blue.3",
  "cyan.3",
  "teal.3",
  "green.3",
  "lime.3",
  "yellow.3",
  "orange.3",
];

export default function NotesBoard({ notesData, setNotesData }) {
  const [notes, setNotes] = useState(notesData || initialNotes);
  const [opened, { open, close }] = useDisclosure(false);
  const [editingNote, setEditingNote] = useState(null);
  const [newNote, setNewNote] = useState({
    title: "",
    content: "",
    color: MANTINE_COLORS[0],
  });

  const handleDataChange = (updatedNotes) => {
    setNotes(updatedNotes);
    setNotesData(updatedNotes);
  };

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

  const handleSubmitNote = () => {
    if (editingNote) {
      handleDataChange(
        notes.map((note) =>
          note.id === editingNote.id ? { ...editingNote, ...newNote } : note
        )
      );
    } else {
      handleDataChange([...notes, { ...newNote, id: Date.now() }]);
    }
    close();
  };

  const deleteNote = (id) => {
    handleDataChange(notes.filter((note) => note.id !== id));
  };

  return (
    <Paper shadow="md" p="lg" radius="md" withBorder>
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
            format="hex" // Store as hex, Mantine can handle it for bg
          />
          <Button onClick={handleSubmitNote} fullWidth mt="md">
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
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {notes.map((note) => (
            <Card
              key={note.id}
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
              style={{
                backgroundColor: `var(--mantine-color-${note.color.replace(
                  ".",
                  "-"
                )})`,
              }}
            >
              <Card.Section withBorder inheritPadding py="xs">
                <Group justify="space-between">
                  <Text fw={500}>{note.title}</Text>
                  <Group gap="xs">
                    <ActionIcon
                      variant="transparent"
                      color="dark"
                      onClick={() => handleOpenModal(note)}
                    >
                      <IconPencil size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="transparent"
                      color="dark"
                      onClick={() => deleteNote(note.id)}
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
      ) : (
        <Text c="dimmed" align="center" mt="xl">
          No notes yet. Add some to get started!
        </Text>
      )}
    </Paper>
  );
}
