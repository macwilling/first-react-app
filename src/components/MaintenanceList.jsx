// src/components/MaintenanceList.jsx
import { useState, useEffect } from "react";
import {
  Button,
  TextInput,
  Modal,
  Group,
  Stack,
  Title,
  Text,
  Paper,
  ActionIcon,
  Badge,
  Table,
  Box,
  Checkbox,
  Select,
  NumberInput,
  LoadingOverlay,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useDisclosure } from "@mantine/hooks";
import dayjs from "dayjs";
import {
  IconPlus,
  IconTrash,
  IconPencil,
  IconRefreshDot,
  IconRepeat,
  IconCheck,
} from "@tabler/icons-react";
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
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";

const recurrenceTypes = [
  { value: "days", label: "Day(s)" },
  { value: "weeks", label: "Week(s)" },
  { value: "months", label: "Month(s)" },
  { value: "years", label: "Year(s)" },
];

const TASKS_COLLECTION = "maintenanceTasks";

export default function MaintenanceList() {
  const [tasks, setTasks] = useState([]); // Local state for tasks from Firestore
  const [loading, setLoading] = useState(true);
  const [opened, { open, close }] = useDisclosure(false);
  const [editingTask, setEditingTask] = useState(null); // Task object from Firestore
  const [newTask, setNewTask] = useState({
    title: "",
    dueDate: null,
    isRecurring: false,
    recurrenceInterval: 1,
    recurrenceType: "months",
  });

  // --- Firestore Data Fetching (Real-time) ---
  useEffect(() => {
    setLoading(true);
    // Order by due date, nulls last (Firestore doesn't support nullsLast directly in orderBy over different types easily)
    // So we fetch and then sort, or sort by another primary field like createdAt then by dueDate.
    // For simplicity, let's order by createdAt or title for now. Active sorting in UI can handle dueDate.
    const q = query(
      collection(db, TASKS_COLLECTION),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const tasksData = [];
        querySnapshot.forEach((doc) => {
          tasksData.push({ ...doc.data(), id: doc.id });
        });
        // Manual sort by dueDate (nulls last) after fetching
        tasksData.sort(
          (a, b) =>
            (a.dueDate?.toMillis() || Infinity) -
            (b.dueDate?.toMillis() || Infinity)
        );
        setTasks(tasksData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching maintenance tasks: ", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleOpenModal = (taskToEdit = null) => {
    if (taskToEdit) {
      setEditingTask(taskToEdit);
      setNewTask({
        title: taskToEdit.title,
        dueDate: taskToEdit.dueDate ? taskToEdit.dueDate.toDate() : null, // Convert Firestore Timestamp to JS Date
        isRecurring: taskToEdit.isRecurring || false,
        recurrenceInterval: taskToEdit.recurrenceInterval || 1,
        recurrenceType: taskToEdit.recurrenceType || "months",
      });
    } else {
      setEditingTask(null);
      setNewTask({
        title: "",
        dueDate: null,
        isRecurring: false,
        recurrenceInterval: 1,
        recurrenceType: "months",
      });
    }
    open();
  };

  const handleSubmitTask = async () => {
    const taskDataPayload = {
      title: newTask.title,
      dueDate: newTask.dueDate
        ? Timestamp.fromDate(new Date(newTask.dueDate))
        : null,
      isRecurring: newTask.isRecurring,
    };

    if (newTask.isRecurring) {
      taskDataPayload.recurrenceInterval = Math.max(
        1,
        Number(newTask.recurrenceInterval) || 1
      );
      taskDataPayload.recurrenceType = newTask.recurrenceType;
    } else {
      // Ensure recurrence fields are removed or nullified if not recurring
      taskDataPayload.recurrenceInterval = null;
      taskDataPayload.recurrenceType = null;
    }

    setLoading(true);
    try {
      if (editingTask && editingTask.id) {
        const taskRef = doc(db, TASKS_COLLECTION, editingTask.id);
        await updateDoc(taskRef, taskDataPayload);
      } else {
        await addDoc(collection(db, TASKS_COLLECTION), {
          ...taskDataPayload,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Error saving maintenance task: ", error);
    }
    setLoading(false);
    close();
  };

  const deleteTaskFirestore = async (taskId) => {
    // Renamed to avoid conflict with local deleteTask
    setLoading(true);
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    try {
      await deleteDoc(taskRef);
    } catch (error) {
      console.error("Error deleting maintenance task: ", error);
    }
    setLoading(false);
  };

  const markNonRecurringAsDone = async (taskId) => {
    // This will delete it
    await deleteTaskFirestore(taskId);
  };

  const calculateNextDueDateFromToday = (interval, type) => {
    return dayjs().add(interval, type).valueOf(); // Returns millis
  };

  const handleCompleteAndReschedule = async (taskToReschedule) => {
    if (taskToReschedule.isRecurring && taskToReschedule.id) {
      setLoading(true);
      const nextDueDateMillis = calculateNextDueDateFromToday(
        taskToReschedule.recurrenceInterval,
        taskToReschedule.recurrenceType
      );
      const taskRef = doc(db, TASKS_COLLECTION, taskToReschedule.id);
      try {
        await updateDoc(taskRef, {
          dueDate: Timestamp.fromMillis(nextDueDateMillis),
          // lastRescheduledAt: serverTimestamp(), // Optional: track this
        });
      } catch (error) {
        console.error("Error rescheduling task: ", error);
      }
      setLoading(false);
    }
  };

  const getDueDateBadge = (firestoreTimestamp) => {
    if (!firestoreTimestamp) return <Badge color="gray">No Date</Badge>;
    const date = dayjs(firestoreTimestamp.toDate()); // Convert Timestamp to Dayjs object
    const today = dayjs().startOf("day");
    if (date.isBefore(today))
      return (
        <Badge color="red" variant="light">
          Overdue
        </Badge>
      );
    if (date.isSame(today))
      return (
        <Badge color="orange" variant="light">
          Due Today
        </Badge>
      );
    if (date.isBefore(today.add(7, "day")))
      return (
        <Badge color="yellow" variant="light">
          Upcoming
        </Badge>
      );
    return (
      <Badge color="blue" variant="light">
        Later
      </Badge>
    );
  };

  const rows = tasks.map((task) => (
    <Table.Tr key={task.id}>
      <Table.Td>
        <Group gap="xs">
          {task.isRecurring && (
            <IconRepeat
              size={16}
              color="gray"
              title={`Recurs every ${task.recurrenceInterval} ${task.recurrenceType}`}
            />
          )}
          <Text fw={500}>{task.title}</Text>
        </Group>
      </Table.Td>
      <Table.Td>
        {getDueDateBadge(task.dueDate)}
        {task.dueDate && (
          <Text size="xs" c="dimmed" ml={task.dueDate ? "xs" : 0}>
            {dayjs(task.dueDate.toDate()).format("ddd, MMM D, YYYY")}
          </Text>
        )}
      </Table.Td>
      <Table.Td>
        <Group gap="xs">
          {task.isRecurring ? (
            <ActionIcon
              variant="light"
              color="green"
              onClick={() => handleCompleteAndReschedule(task)}
              title={`Complete & Reschedule (next: today + ${task.recurrenceInterval} ${task.recurrenceType})`}
            >
              <IconRefreshDot size={16} />
            </ActionIcon>
          ) : (
            <ActionIcon
              variant="light"
              color="green"
              onClick={() => markNonRecurringAsDone(task.id)}
              title="Mark as Done"
            >
              <IconCheck size={16} />
            </ActionIcon>
          )}
          <ActionIcon
            variant="light"
            color="blue"
            onClick={() => handleOpenModal(task)}
            title="Edit Task"
          >
            <IconPencil size={16} />
          </ActionIcon>
          <ActionIcon
            variant="light"
            color="red"
            onClick={() => deleteTaskFirestore(task.id)}
            title="Delete Task"
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
        title={editingTask ? "Edit Task" : "Add Maintenance Task"}
        centered
      >
        <Stack>
          <TextInput
            label="Task Title"
            placeholder="e.g., Change air filter"
            value={newTask.title}
            onChange={(e) =>
              setNewTask({ ...newTask, title: e.currentTarget.value })
            }
            data-autofocus
          />
          <DatePickerInput
            label="Due Date"
            placeholder="Pick a date"
            value={newTask.dueDate}
            onChange={(value) => setNewTask({ ...newTask, dueDate: value })}
            valueFormat="MMM D, YYYY"
            clearable
            popoverProps={{ withinPortal: true }}
          />
          <Checkbox
            label="Recurring Task"
            checked={newTask.isRecurring}
            onChange={(event) =>
              setNewTask({
                ...newTask,
                isRecurring: event.currentTarget.checked,
              })
            }
          />
          {newTask.isRecurring && (
            <Group grow>
              <NumberInput
                label="Repeats every"
                value={newTask.recurrenceInterval}
                onChange={(value) =>
                  setNewTask({
                    ...newTask,
                    recurrenceInterval: Number(value) || 1,
                  })
                }
                min={1}
                step={1}
              />
              <Select
                label="Period"
                data={recurrenceTypes}
                value={newTask.recurrenceType}
                onChange={(value) =>
                  setNewTask({ ...newTask, recurrenceType: value || "months" })
                }
                allowDeselect={false}
              />
            </Group>
          )}
          <Button
            onClick={handleSubmitTask}
            fullWidth
            mt="md"
            loading={loading}
          >
            {editingTask ? "Save Changes" : "Add Task"}
          </Button>
        </Stack>
      </Modal>

      <Group justify="space-between" mb="xl">
        <Title order={2}>Maintenance Reminders</Title>
        <Button
          onClick={() => handleOpenModal()}
          leftSection={<IconPlus size={18} />}
        >
          New Reminder
        </Button>
      </Group>

      {tasks.length > 0 ? (
        <Box style={{ overflowX: "auto" }}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Title</Table.Th> <Table.Th>Due Date</Table.Th>{" "}
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        </Box>
      ) : !loading ? (
        <Text c="dimmed" align="center" mt="xl">
          No maintenance tasks yet. Add some reminders!
        </Text>
      ) : null}
    </Paper>
  );
}
