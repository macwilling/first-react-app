// src/components/ChoreList.jsx
import { useState, useEffect } from "react";
import {
  Button,
  TextInput,
  Modal,
  Group,
  Select,
  Checkbox,
  Stack,
  Title,
  Text,
  Paper,
  ActionIcon,
  Badge,
  Table,
  Avatar,
  Box,
  MultiSelect,
  NumberInput,
  LoadingOverlay, // For loading state
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconPlus,
  IconTrash,
  IconPencil,
  IconRepeat,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { db } from "../firebase"; // Import your Firebase config
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp, // For Firestore Timestamps
  serverTimestamp, // For server-side timestamps
} from "firebase/firestore";

const family = ["Alice", "Bob", "Charlie", "Mom", "Dad"]; // Keep for assignment dropdown
const familyColors = {
  Alice: "pink",
  Bob: "indigo",
  Charlie: "cyan",
  Mom: "grape",
  Dad: "teal",
};

const recurrenceTypes = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];
const daysOfWeek = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const CHORES_COLLECTION = "chores"; // Define collection name

export default function ChoreList() {
  const [chores, setChores] = useState([]); // Local state to hold chores from Firestore
  const [loading, setLoading] = useState(true); // Loading state
  const [opened, { open, close }] = useDisclosure(false);
  const [editingChore, setEditingChore] = useState(null); // Chore object from Firestore (includes id)
  const [newChore, setNewChore] = useState({
    title: "",
    assignedTo: family[0] || "",
    isRecurring: false,
    recurrenceType: "daily",
    recurrenceInterval: 1,
    recurrenceDays: [],
  });

  // --- Firestore Data Fetching (Real-time) ---
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, CHORES_COLLECTION),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const choresData = [];
        querySnapshot.forEach((doc) => {
          choresData.push({ ...doc.data(), id: doc.id });
        });
        setChores(choresData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching chores: ", error);
        setLoading(false);
      }
    );

    return () => unsubscribe(); // Cleanup listener on component unmount
  }, []); // Empty dependency array means this runs once on mount

  const handleOpenModal = (choreToEdit = null) => {
    if (choreToEdit) {
      setEditingChore(choreToEdit); // choreToEdit is the full chore object from state
      setNewChore({
        title: choreToEdit.title,
        assignedTo: choreToEdit.assignedTo,
        isRecurring: choreToEdit.isRecurring || false,
        recurrenceType: choreToEdit.recurrenceType || "daily",
        recurrenceInterval: choreToEdit.recurrenceInterval || 1,
        recurrenceDays: choreToEdit.recurrenceDays || [],
      });
    } else {
      setEditingChore(null);
      setNewChore({
        title: "",
        assignedTo: family[0] || "",
        isRecurring: false,
        recurrenceType: "daily",
        recurrenceInterval: 1,
        recurrenceDays: [],
      });
    }
    open();
  };

  const handleSubmitChore = async () => {
    const choreDataPayload = {
      title: newChore.title,
      assignedTo: newChore.assignedTo,
      isRecurring: newChore.isRecurring,
      // Firestore specific data types / handling
      done: false, // New chores are not done
      // completedAt will be set when done
    };

    if (newChore.isRecurring) {
      choreDataPayload.recurrenceType = newChore.recurrenceType;
      choreDataPayload.recurrenceInterval = Math.max(
        1,
        Number(newChore.recurrenceInterval) || 1
      );
      choreDataPayload.recurrenceDays =
        newChore.recurrenceType === "weekly" ? newChore.recurrenceDays : [];
    }

    setLoading(true);
    try {
      if (editingChore && editingChore.id) {
        // Update existing chore
        const choreRef = doc(db, CHORES_COLLECTION, editingChore.id);
        await updateDoc(choreRef, choreDataPayload); // Don't update createdAt
      } else {
        // Add new chore
        await addDoc(collection(db, CHORES_COLLECTION), {
          ...choreDataPayload,
          createdAt: serverTimestamp(), // Use server timestamp for creation
          completedAt: null,
        });
      }
    } catch (error) {
      console.error("Error saving chore: ", error);
    }
    setLoading(false);
    close();
  };

  const toggleDone = async (choreId, currentDoneStatus, isRecurringChore) => {
    setLoading(true);
    const choreRef = doc(db, CHORES_COLLECTION, choreId);
    try {
      if (isRecurringChore) {
        if (!currentDoneStatus) {
          // If marking a recurring chore as done
          // For recurring: log completion (optional step for full history, not done here yet), then reset
          await updateDoc(choreRef, {
            // lastCompletedAt: serverTimestamp(), // Example: if you want to track actual completions
            done: false, // Reset for next time
            completedAt: null,
          });
        } else {
          // If unchecking a recurring chore (making it pending from a 'false' state)
          // This case might need more thought - usually recurring chores go from pending to done, then reset.
          // For now, this will just make it "not done".
          await updateDoc(choreRef, { done: false, completedAt: null });
        }
      } else {
        // For non-recurring chores
        await updateDoc(choreRef, {
          done: !currentDoneStatus,
          completedAt: !currentDoneStatus ? serverTimestamp() : null,
        });
      }
    } catch (error) {
      console.error("Error updating chore status: ", error);
    }
    setLoading(false);
  };

  const deleteChore = async (choreId) => {
    setLoading(true);
    const choreRef = doc(db, CHORES_COLLECTION, choreId);
    try {
      await deleteDoc(choreRef);
    } catch (error) {
      console.error("Error deleting chore: ", error);
    }
    setLoading(false);
  };

  const rows = chores.map((chore) => (
    <Table.Tr
      key={chore.id}
      bg={chore.done && !chore.isRecurring ? "gray.1" : undefined}
    >
      <Table.Td>
        <Checkbox
          checked={chore.done}
          onChange={() => toggleDone(chore.id, chore.done, chore.isRecurring)}
          aria-label="Mark as done"
        />
      </Table.Td>
      <Table.Td>
        <Group gap="xs">
          {chore.isRecurring && <IconRepeat size={16} color="gray" />}
          <Text fw={500} strikethrough={chore.done && !chore.isRecurring}>
            {chore.title}
          </Text>
        </Group>
        {chore.done && chore.completedAt && !chore.isRecurring && (
          <Text size="xs" c="dimmed">
            Completed:{" "}
            {chore.completedAt
              ? dayjs(chore.completedAt.toDate()).format("MMM D, h:mm A")
              : "N/A"}
          </Text>
        )}
      </Table.Td>
      <Table.Td>
        <Group gap="xs" align="center">
          <Avatar
            color={familyColors[chore.assignedTo] || "gray"}
            size="sm"
            radius="xl"
          >
            {chore.assignedTo?.substring(0, 2).toUpperCase()}
          </Avatar>
          <Text size="sm">{chore.assignedTo}</Text>
        </Group>
      </Table.Td>
      <Table.Td>
        {chore.done && !chore.isRecurring ? (
          <Badge color="green">Done</Badge>
        ) : (
          <Badge color="orange">Pending</Badge>
        )}
      </Table.Td>
      <Table.Td>
        <Group gap="xs">
          <ActionIcon
            variant="light"
            color="blue"
            onClick={() => handleOpenModal(chore)}
            title="Edit Chore"
          >
            <IconPencil size={16} />
          </ActionIcon>
          <ActionIcon
            variant="light"
            color="red"
            onClick={() => deleteChore(chore.id)}
            title="Delete Chore"
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Paper
      shadow="md"
      p="lg"
      radius="md"
      withBorder
      style={{ position: "relative" }}
    >
      <LoadingOverlay
        visible={loading}
        zIndex={1000}
        overlayProps={{ radius: "sm", blur: 2 }}
      />
      <Modal
        opened={opened}
        onClose={close}
        title={editingChore ? "Edit Chore" : "Add New Chore"}
        centered
        size="md"
      >
        {/* Modal content for adding/editing chores remains largely the same as your last version */}
        <Stack>
          <TextInput
            label="Chore Title"
            placeholder="e.g., Wash dishes"
            value={newChore.title}
            onChange={(e) =>
              setNewChore({ ...newChore, title: e.currentTarget.value })
            }
            data-autofocus
          />
          <Select
            label="Assign To"
            placeholder="Select family member"
            data={family}
            value={newChore.assignedTo}
            onChange={(value) =>
              setNewChore({ ...newChore, assignedTo: value || family[0] || "" })
            }
            allowDeselect={false}
          />
          <Checkbox
            mt="sm"
            label="Recurring Chore"
            checked={newChore.isRecurring}
            onChange={(event) =>
              setNewChore({
                ...newChore,
                isRecurring: event.currentTarget.checked,
              })
            }
          />
          {newChore.isRecurring && (
            <Paper p="sm" withBorder radius="sm" mt="xs">
              <Group grow>
                <NumberInput
                  label="Repeats every"
                  value={newChore.recurrenceInterval}
                  onChange={(value) =>
                    setNewChore({
                      ...newChore,
                      recurrenceInterval: Number(value) || 1,
                    })
                  }
                  min={1}
                  step={1}
                />
                <Select
                  label="Period"
                  data={recurrenceTypes}
                  value={newChore.recurrenceType}
                  onChange={(value) =>
                    setNewChore({
                      ...newChore,
                      recurrenceType: value || "daily",
                    })
                  }
                  allowDeselect={false}
                />
              </Group>
              {newChore.recurrenceType === "weekly" && (
                <MultiSelect
                  mt="sm"
                  label="On these days of the week"
                  data={daysOfWeek}
                  value={newChore.recurrenceDays}
                  onChange={(value) =>
                    setNewChore({ ...newChore, recurrenceDays: value })
                  }
                  placeholder="Select days"
                  clearable
                />
              )}
            </Paper>
          )}
          <Button
            onClick={handleSubmitChore}
            fullWidth
            mt="md"
            loading={loading}
          >
            {editingChore ? "Save Changes" : "Add Chore"}
          </Button>
        </Stack>
      </Modal>

      <Group justify="space-between" mb="xl">
        <Title order={2}>Chore Tracker</Title>
        <Button
          onClick={() => handleOpenModal()}
          leftSection={<IconPlus size={18} />}
        >
          New Chore
        </Button>
      </Group>

      {chores.length > 0 ? (
        <Box style={{ overflowX: "auto" }}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: 40 }} /> <Table.Th>Title</Table.Th>
                <Table.Th>Assigned To</Table.Th> <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        </Box>
      ) : !loading ? ( // Only show "No chores" if not loading
        <Text c="dimmed" align="center" mt="xl">
          No chores yet. Add some to get started!
        </Text>
      ) : null}
    </Paper>
  );
}
