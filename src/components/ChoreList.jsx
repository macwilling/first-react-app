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
  LoadingOverlay,
  List,
  ThemeIcon,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconPlus,
  IconTrash,
  IconPencil,
  IconRepeat,
  IconCalendarDue,
} from "@tabler/icons-react"; // IconPencil is already here
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
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
  Timestamp,
} from "firebase/firestore";

dayjs.extend(isSameOrBefore);

const family = ["Alice", "Bob", "Charlie", "Mom", "Dad"];
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

const CHORES_COLLECTION = "chores";

// --- Recurrence Helper Functions ---
const getFirstNextDueDate = (
  baseDate,
  recurrenceType,
  recurrenceInterval,
  recurrenceDays = []
) => {
  let startDate = dayjs(baseDate).startOf("day");
  if (recurrenceType === "daily") {
    return startDate.add(recurrenceInterval, "day").valueOf();
  } else if (recurrenceType === "weekly") {
    const numericRecurrenceDays = recurrenceDays
      .map(Number)
      .sort((a, b) => a - b);
    if (numericRecurrenceDays.length === 0) {
      return startDate.add(recurrenceInterval, "week").valueOf();
    }
    let potentialDate = startDate.clone();
    // Check from today onwards to find the first matching day
    for (let i = 0; i < 14 + 7 * recurrenceInterval; i++) {
      potentialDate = startDate.add(i, "day");
      if (numericRecurrenceDays.includes(potentialDate.day())) {
        return potentialDate.valueOf();
      }
    }
    return startDate.add(recurrenceInterval, "week").valueOf(); // Fallback
  }
  return startDate.add(1, "day").valueOf();
};

const getNextDueDateAfterCompletion = (
  lastCompletedOrDueDate,
  recurrenceType,
  recurrenceInterval,
  recurrenceDays = []
) => {
  let anchorDate = dayjs(lastCompletedOrDueDate).startOf("day");
  if (recurrenceType === "daily") {
    return anchorDate.add(recurrenceInterval, "day").valueOf();
  } else if (recurrenceType === "weekly") {
    let newAnchorBase = anchorDate.clone();
    // This simplified logic advances by the interval from the anchorDate's day of week.
    // If specific days are selected, it will land on the same day of week, X weeks later.
    // More complex logic would be needed if, e.g., after completing a "Monday" task in a "M,W,F" schedule,
    // the next should be "Wednesday" of the same week (if interval allows).
    // For now, it advances the whole week chunk.
    if (recurrenceDays.length > 0) {
      return anchorDate.add(recurrenceInterval, "week").valueOf();
    } else {
      return anchorDate.add(recurrenceInterval, "week").valueOf();
    }
  }
  return anchorDate.add(1, "day").valueOf();
};

export default function ChoreList() {
  const [allChores, setAllChores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  const [editingChore, setEditingChore] = useState(null);
  const [newChore, setNewChore] = useState({
    title: "",
    assignedTo: family[0] || "",
    isRecurring: false,
    recurrenceType: "daily",
    recurrenceInterval: 1,
    recurrenceDays: [],
  });

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
        setAllChores(choresData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching chores: ", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleOpenModal = (choreToEdit = null) => {
    if (choreToEdit) {
      setEditingChore(choreToEdit);
      setNewChore({
        title: choreToEdit.title,
        assignedTo: choreToEdit.assignedTo,
        isRecurring: choreToEdit.isRecurring || false,
        recurrenceType: choreToEdit.recurrenceType || "daily",
        recurrenceInterval: choreToEdit.recurrenceInterval || 1,
        recurrenceDays: choreToEdit.recurrenceDays || [],
        // Store nextDueDate from choreToEdit if needed for modal logic, but modal doesn't directly edit it.
        // nextDueDate: choreToEdit.nextDueDate ? choreToEdit.nextDueDate.toDate() : null
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
    const {
      title,
      assignedTo,
      isRecurring,
      recurrenceType,
      recurrenceInterval,
      recurrenceDays,
    } = newChore;
    const choreDataPayload = { title, assignedTo, isRecurring, done: false };

    if (isRecurring) {
      choreDataPayload.recurrenceType = recurrenceType;
      choreDataPayload.recurrenceInterval = Math.max(
        1,
        Number(recurrenceInterval) || 1
      );
      choreDataPayload.recurrenceDays =
        recurrenceType === "weekly" ? recurrenceDays : [];

      // If editing an existing recurring chore AND the recurrence pattern has changed,
      // you *might* want to recalculate nextDueDate here.
      // For simplicity, we'll assume nextDueDate is primarily updated upon instance completion.
      // However, if it's a NEW recurring chore, calculate its first nextDueDate.
      if (!editingChore) {
        const firstDueDate = getFirstNextDueDate(
          dayjs(),
          recurrenceType,
          choreDataPayload.recurrenceInterval,
          choreDataPayload.recurrenceDays
        );
        choreDataPayload.nextDueDate = Timestamp.fromMillis(firstDueDate);
      } else if (editingChore && !editingChore.nextDueDate && isRecurring) {
        // If editing a chore that was made recurring and didn't have a nextDueDate yet
        const firstDueDate = getFirstNextDueDate(
          dayjs(),
          recurrenceType,
          choreDataPayload.recurrenceInterval,
          choreDataPayload.recurrenceDays
        );
        choreDataPayload.nextDueDate = Timestamp.fromMillis(firstDueDate);
      }
      // If editing a chore and changing it FROM non-recurring TO recurring:
      if (editingChore && !editingChore.isRecurring && isRecurring) {
        const firstDueDate = getFirstNextDueDate(
          dayjs(),
          recurrenceType,
          choreDataPayload.recurrenceInterval,
          choreDataPayload.recurrenceDays
        );
        choreDataPayload.nextDueDate = Timestamp.fromMillis(firstDueDate);
        choreDataPayload.lastInstanceCompletedAt = null; // Reset this
      }
    } else {
      // If it's NOT recurring (or changed from recurring to non-recurring)
      choreDataPayload.recurrenceType = null;
      choreDataPayload.recurrenceInterval = null;
      choreDataPayload.recurrenceDays = [];
      choreDataPayload.nextDueDate = null;
      choreDataPayload.lastInstanceCompletedAt = null;
    }

    setLoading(true);
    try {
      if (editingChore && editingChore.id) {
        const choreRef = doc(db, CHORES_COLLECTION, editingChore.id);
        await updateDoc(choreRef, choreDataPayload);
      } else {
        await addDoc(collection(db, CHORES_COLLECTION), {
          ...choreDataPayload,
          createdAt: serverTimestamp(),
          completedAt: null,
          lastInstanceCompletedAt: isRecurring ? null : undefined, // Only relevant for recurring
        });
      }
    } catch (error) {
      console.error("Error saving chore: ", error);
    }
    setLoading(false);
    close();
  };

  const handleCompleteInstance = async (chore) => {
    if (!chore || !chore.id) return;
    setLoading(true);
    const choreRef = doc(db, CHORES_COLLECTION, chore.id);
    try {
      if (chore.isRecurring) {
        const baseDateForNext = chore.nextDueDate
          ? chore.nextDueDate.toMillis()
          : Date.now();
        const newNextDueDateMillis = getNextDueDateAfterCompletion(
          baseDateForNext,
          chore.recurrenceType,
          chore.recurrenceInterval,
          chore.recurrenceDays
        );
        await updateDoc(choreRef, {
          lastInstanceCompletedAt: serverTimestamp(),
          nextDueDate: Timestamp.fromMillis(newNextDueDateMillis),
        });
      } else {
        await updateDoc(choreRef, {
          done: true,
          completedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Error completing chore instance: ", error);
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

  const today = dayjs().startOf("day");
  const activeChores = allChores
    .filter((chore) => {
      if (!chore.isRecurring) return !chore.done;
      if (chore.nextDueDate && chore.nextDueDate.toDate) {
        return dayjs(chore.nextDueDate.toDate()).isSameOrBefore(today, "day");
      }
      return false;
    })
    .sort((a, b) => {
      const aDate = a.isRecurring
        ? a.nextDueDate?.toMillis() || Infinity
        : a.createdAt?.toMillis() || Infinity;
      const bDate = b.isRecurring
        ? b.nextDueDate?.toMillis() || Infinity
        : b.createdAt?.toMillis() || Infinity;
      return aDate - bDate;
    });

  const upcomingRecurringChores = allChores
    .filter((chore) => {
      if (!chore.isRecurring || !chore.nextDueDate || !chore.nextDueDate.toDate)
        return false;
      return dayjs(chore.nextDueDate.toDate()).isAfter(today, "day");
    })
    .sort((a, b) => a.nextDueDate.toMillis() - b.nextDueDate.toMillis());

  const rows = activeChores.map((chore) => (
    <Table.Tr
      key={chore.id}
      bg={!chore.isRecurring && chore.done ? "gray.1" : undefined}
    >
      <Table.Td>
        <Checkbox
          checked={!chore.isRecurring && chore.done}
          onChange={() => handleCompleteInstance(chore)}
          aria-label="Mark as done"
        />
      </Table.Td>
      <Table.Td>
        <Group gap="xs">
          {chore.isRecurring && (
            <IconRepeat
              size={16}
              color="gray"
              title={`Recurs every ${chore.recurrenceInterval} ${chore.recurrenceType}`}
            />
          )}
          <Text fw={500} strikethrough={!chore.isRecurring && chore.done}>
            {chore.title}
          </Text>
        </Group>
        {chore.isRecurring && chore.nextDueDate && (
          <Text size="xs" c="dimmed">
            Due: {dayjs(chore.nextDueDate.toDate()).format("ddd, MMM D")}
          </Text>
        )}
        {!chore.isRecurring && chore.done && chore.completedAt && (
          <Text size="xs" c="dimmed">
            Completed:{" "}
            {dayjs(chore.completedAt.toDate()).format("MMM D, h:mm A")}
          </Text>
        )}
        {chore.isRecurring && chore.lastInstanceCompletedAt && (
          <Text size="xs" c="dimmed" fs="italic">
            (Last done:{" "}
            {dayjs(chore.lastInstanceCompletedAt.toDate()).format(
              "MMM D, h:mm A"
            )}
            )
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
        {!chore.isRecurring && chore.done ? (
          <Badge color="green">Done</Badge>
        ) : chore.isRecurring &&
          chore.nextDueDate &&
          dayjs(chore.nextDueDate.toDate()).isBefore(today, "day") ? (
          <Badge color="red" variant="light">
            Overdue
          </Badge>
        ) : chore.isRecurring &&
          chore.nextDueDate &&
          dayjs(chore.nextDueDate.toDate()).isSame(today, "day") ? (
          <Badge color="orange" variant="light">
            Due Today
          </Badge>
        ) : (
          <Badge color="blue" variant="outline">
            Pending
          </Badge>
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
    <>
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
                setNewChore({
                  ...newChore,
                  assignedTo: value || family[0] || "",
                })
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
                <Text size="xs" c="dimmed" mt="xs">
                  Note: The first due date will be the next available slot.
                  Editing recurrence settings won't change an existing 'Next Due
                  Date' until the current instance is completed.
                </Text>
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
          <Title order={2}>Active Chores</Title>
          <Button
            onClick={() => handleOpenModal()}
            leftSection={<IconPlus size={18} />}
          >
            New Chore
          </Button>
        </Group>

        {activeChores.length > 0 ? (
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
        ) : !loading ? (
          <Text c="dimmed" align="center" mt="xl">
            No active chores. Well done!
          </Text>
        ) : null}
      </Paper>

      {/* --- Upcoming Scheduled Chores Section --- */}
      {upcomingRecurringChores.length > 0 && !loading && (
        <Paper shadow="sm" p="lg" radius="md" withBorder mt="xl">
          <Title order={3} mb="md">
            Upcoming Scheduled Chores
          </Title>
          <List spacing="sm" size="sm">
            {upcomingRecurringChores.map((chore) => (
              <List.Item
                key={chore.id}
                icon={
                  <ThemeIcon color="gray" size={24} radius="xl">
                    <IconCalendarDue size={16} />
                  </ThemeIcon>
                }
              >
                <Group justify="space-between">
                  <Box>
                    <Text>{chore.title}</Text>
                    <Text size="xs" c="dimmed">
                      Assigned to: {chore.assignedTo}
                    </Text>
                  </Box>
                  <Group>
                    {" "}
                    {/* Group for badge and edit button */}
                    <Badge color="blue" variant="light">
                      Due:{" "}
                      {dayjs(chore.nextDueDate.toDate()).format("ddd, MMM D")}
                    </Badge>
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      onClick={() => handleOpenModal(chore)}
                      title="Edit Chore"
                    >
                      <IconPencil size={16} />
                    </ActionIcon>
                  </Group>
                </Group>
              </List.Item>
            ))}
          </List>
        </Paper>
      )}
    </>
  );
}
