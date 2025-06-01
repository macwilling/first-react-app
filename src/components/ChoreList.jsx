// src/components/ChoreList.jsx
import React, { useState, useEffect } from "react";
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
  Alert,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconPlus,
  IconTrash,
  IconPencil,
  IconRepeat,
  IconCalendarDue,
  IconAlertCircle,
} from "@tabler/icons-react";
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
import { useAuth } from "../contexts/AuthContext"; // Corrected Import Path

dayjs.extend(isSameOrBefore);

const familyMembersMock = ["Alice", "Bob", "Charlie", "Mom", "Dad"];
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

const getFirstNextDueDate = (
  baseDate,
  recurrenceType,
  recurrenceInterval,
  recurrenceDays = []
) => {
  /* ... same ... */
  let startDate = dayjs(baseDate).startOf("day");
  if (recurrenceType === "daily") {
    return startDate.add(recurrenceInterval, "day").valueOf();
  } else if (recurrenceType === "weekly") {
    const numericRecurrenceDays = recurrenceDays
      .map(Number)
      .sort((a, b) => a - b);
    if (numericRecurrenceDays.length === 0)
      return startDate.add(recurrenceInterval, "week").valueOf();
    let potentialDate = startDate.clone();
    for (let i = 0; i < 14 + 7 * recurrenceInterval; i++) {
      potentialDate = startDate.add(i, "day");
      if (numericRecurrenceDays.includes(potentialDate.day()))
        return potentialDate.valueOf();
    }
    return startDate.add(recurrenceInterval, "week").valueOf();
  }
  return startDate.add(1, "day").valueOf();
};
const getNextDueDateAfterCompletion = (
  lastCompletedOrDueDate,
  recurrenceType,
  recurrenceInterval,
  recurrenceDays = []
) => {
  /* ... same, (ensure it's the updated one from previous turn if changes were made) ... */
  let anchorDate = dayjs(lastCompletedOrDueDate).startOf("day");
  if (recurrenceType === "daily") {
    return anchorDate.add(recurrenceInterval, "day").valueOf();
  } else if (recurrenceType === "weekly") {
    const numericRecurrenceDays = recurrenceDays
      .map(Number)
      .sort((a, b) => a - b);
    if (numericRecurrenceDays.length > 0) {
      let potentialNextDate = anchorDate.clone();
      // Start searching from the day *after* the anchorDate to find the next valid day.
      for (let i = 1; i <= 7 * (recurrenceInterval || 1) + 7; i++) {
        potentialNextDate = anchorDate.add(i, "day");
        if (numericRecurrenceDays.includes(potentialNextDate.day())) {
          // If recurrenceInterval is e.g. 2 weeks, and the found day is within the first week after anchor,
          // we might need to advance it further if the goal is strictly "every N weeks on day X".
          // For simplicity, this version finds the *next* occurrence of a selected day.
          // More complex logic might be needed if "every 2 weeks on Monday" means "skip next Monday if it's only 1 week away".
          return potentialNextDate.valueOf();
        }
      }
      // Fallback: advance by interval and pick the first available day of week
      return anchorDate
        .add(recurrenceInterval || 1, "week")
        .day(numericRecurrenceDays[0])
        .valueOf();
    } else {
      // No specific days, just advance by interval
      return anchorDate.add(recurrenceInterval || 1, "week").valueOf();
    }
  }
  return anchorDate.add(1, "day").valueOf();
};

export default function ChoreList() {
  const { familyId, userProfile } = useAuth();
  const [allChores, setAllChores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [editingChore, setEditingChore] = useState(null);
  const [newChore, setNewChore] = useState({
    title: "",
    assignedTo: "",
    isRecurring: false,
    recurrenceType: "daily",
    recurrenceInterval: 1,
    recurrenceDays: [],
  });

  const [familyMembers, setFamilyMembers] = useState([]);

  useEffect(() => {
    if (familyId && userProfile?.familyId === familyId) {
      const familyDocRef = doc(db, "families", familyId);
      const unsub = onSnapshot(
        familyDocRef,
        async (docSnap) => {
          // Make async to fetch profiles
          if (docSnap.exists()) {
            const membersData = docSnap.data().members;
            if (membersData) {
              const memberIds = Object.keys(membersData);
              const memberProfiles = await Promise.all(
                memberIds.map(async (uid) => {
                  const userDoc = await getDoc(doc(db, "users", uid));
                  return userDoc.exists()
                    ? { id: uid, ...userDoc.data() }
                    : { id: uid, displayName: "Unknown User" };
                })
              );
              // Use displayName for Select data
              const memberSelectData = memberProfiles.map(
                (p) => p.displayName || p.id
              );
              setFamilyMembers(
                memberSelectData.length > 0
                  ? memberSelectData
                  : familyMembersMock
              );
              if (!newChore.assignedTo && memberSelectData.length > 0) {
                setNewChore((prev) => ({
                  ...prev,
                  assignedTo: memberSelectData[0],
                }));
              } else if (
                !newChore.assignedTo &&
                familyMembersMock.length > 0 &&
                memberSelectData.length === 0
              ) {
                setNewChore((prev) => ({
                  ...prev,
                  assignedTo: familyMembersMock[0],
                }));
              }
            } else {
              setFamilyMembers(familyMembersMock);
            }
          } else {
            setFamilyMembers(familyMembersMock);
          }
        },
        (err) => {
          console.error("Error fetching family members:", err);
          setFamilyMembers(familyMembersMock); // Fallback on error
        }
      );
      return () => unsub();
    } else {
      setFamilyMembers(familyMembersMock);
    }
  }, [familyId, userProfile]); // Rerun if userProfile changes (e.g., familyId assigned)

  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      setAllChores([]);
      return;
    }
    setLoading(true);
    setError(null);
    const choresCollectionPath = `families/${familyId}/chores`;
    const q = query(
      collection(db, choresCollectionPath),
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
      (err) => {
        console.error(`Error fetching chores for family ${familyId}: `, err);
        setError("Failed to load chores.");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [familyId]);

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
      });
    } else {
      setEditingChore(null);
      setNewChore({
        title: "",
        assignedTo: familyMembers[0] || familyMembersMock[0] || "",
        isRecurring: false,
        recurrenceType: "daily",
        recurrenceInterval: 1,
        recurrenceDays: [],
      });
    }
    open();
  };

  const handleSubmitChore = async () => {
    if (!familyId) {
      setError("Cannot save chore: No family selected.");
      return;
    }
    const {
      title,
      assignedTo,
      isRecurring,
      recurrenceType,
      recurrenceInterval,
      recurrenceDays,
    } = newChore;
    if (!title.trim() || !assignedTo) {
      setError("Title and Assignee are required.");
      return;
    }

    setLoading(true);
    setError(null);
    const choresCollectionPath = `families/${familyId}/chores`;
    const choreDataPayload = { title, assignedTo, isRecurring, done: false };

    if (isRecurring) {
      choreDataPayload.recurrenceType = recurrenceType;
      choreDataPayload.recurrenceInterval = Math.max(
        1,
        Number(recurrenceInterval) || 1
      );
      choreDataPayload.recurrenceDays =
        recurrenceType === "weekly" ? recurrenceDays : [];
      if (
        !editingChore ||
        (editingChore && !editingChore.isRecurring && isRecurring) ||
        (editingChore && isRecurring && !editingChore.nextDueDate)
      ) {
        const firstDueDate = getFirstNextDueDate(
          dayjs(),
          recurrenceType,
          choreDataPayload.recurrenceInterval,
          choreDataPayload.recurrenceDays
        );
        choreDataPayload.nextDueDate = Timestamp.fromMillis(firstDueDate);
      }
    } else {
      choreDataPayload.recurrenceType = null;
      choreDataPayload.recurrenceInterval = null;
      choreDataPayload.recurrenceDays = [];
      choreDataPayload.nextDueDate = null;
      choreDataPayload.lastInstanceCompletedAt = null;
    }

    try {
      if (editingChore && editingChore.id) {
        const choreRef = doc(db, choresCollectionPath, editingChore.id);
        await updateDoc(choreRef, choreDataPayload);
      } else {
        await addDoc(collection(db, choresCollectionPath), {
          ...choreDataPayload,
          createdAt: serverTimestamp(),
          completedAt: null,
          lastInstanceCompletedAt: isRecurring ? null : undefined,
        });
      }
      close();
    } catch (err) {
      console.error("Error saving chore: ", err);
      setError("Failed to save chore.");
    }
    setLoading(false);
  };

  const handleCompleteInstance = async (chore) => {
    if (!familyId || !chore || !chore.id) return;
    setLoading(true);
    setError(null);
    const choreRef = doc(db, `families/${familyId}/chores`, chore.id);
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
    } catch (err) {
      console.error("Error completing chore instance: ", err);
      setError("Failed to complete chore.");
    }
    setLoading(false);
  };

  const deleteChore = async (choreId) => {
    if (!familyId) {
      setError("Cannot delete chore: No family selected.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this chore?")) return;
    setLoading(true);
    setError(null);
    const choreRef = doc(db, `families/${familyId}/chores`, choreId);
    try {
      await deleteDoc(choreRef);
    } catch (err) {
      console.error("Error deleting chore: ", err);
      setError("Failed to delete chore.");
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
    .filter(
      (chore) =>
        chore.isRecurring &&
        chore.nextDueDate?.toDate &&
        dayjs(chore.nextDueDate.toDate()).isAfter(today, "day")
    )
    .sort((a, b) => a.nextDueDate.toMillis() - b.nextDueDate.toMillis());

  const rows = activeChores.map((chore) => (
    <Table.Tr
      key={chore.id}
      bg={
        !chore.isRecurring && chore.done
          ? "var(--mantine-color-gray-1)"
          : undefined
      }
    >
      <Table.Td>
        {" "}
        <Checkbox
          checked={!chore.isRecurring && chore.done}
          onChange={() => handleCompleteInstance(chore)}
          aria-label="Mark as done"
        />{" "}
      </Table.Td>
      <Table.Td>
        <Group gap="xs">
          {" "}
          {chore.isRecurring && (
            <IconRepeat
              size={16}
              color="gray"
              title={`Recurs every ${chore.recurrenceInterval} ${chore.recurrenceType}`}
            />
          )}{" "}
          <Text fw={500} strikethrough={!chore.isRecurring && chore.done}>
            {chore.title}
          </Text>{" "}
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
        {" "}
        <Group gap="xs" align="center">
          {" "}
          <Avatar
            color={familyColors[chore.assignedTo] || "gray"}
            size="sm"
            radius="xl"
          >
            {chore.assignedTo?.substring(0, 2).toUpperCase()}
          </Avatar>{" "}
          <Text size="sm">{chore.assignedTo}</Text>{" "}
        </Group>{" "}
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
        {" "}
        <Group gap="xs">
          {" "}
          <ActionIcon
            variant="light"
            color="blue"
            onClick={() => handleOpenModal(chore)}
            title="Edit Chore"
          >
            <IconPencil size={16} />
          </ActionIcon>{" "}
          <ActionIcon
            variant="light"
            color="red"
            onClick={() => deleteChore(chore.id)}
            title="Delete Chore"
          >
            <IconTrash size={16} />
          </ActionIcon>{" "}
        </Group>{" "}
      </Table.Td>
    </Table.Tr>
  ));

  if (!familyId && !loading) {
    return (
      <Paper p="lg" withBorder>
        <Text>Please create or join a family to use the chore list.</Text>
      </Paper>
    );
  }

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
          visible={loading && !error}
          zIndex={1000}
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
              required
            />
            <Select
              label="Assign To"
              placeholder="Select family member"
              data={familyMembers}
              value={newChore.assignedTo}
              onChange={(value) =>
                setNewChore({
                  ...newChore,
                  assignedTo: value || familyMembers[0] || "",
                })
              }
              allowDeselect={false}
              required
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
          {" "}
          <Title order={2}>Active Chores</Title>{" "}
          <Button
            onClick={() => handleOpenModal()}
            leftSection={<IconPlus size={18} />}
            disabled={!familyId || loading}
          >
            New Chore
          </Button>{" "}
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
        ) : !loading && familyId ? (
          <Text c="dimmed" ta="center" mt="xl">
            No active chores for this family. Well done!
          </Text>
        ) : null}
      </Paper>
      {upcomingRecurringChores.length > 0 && !loading && familyId && (
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
