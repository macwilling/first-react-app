// src/components/MaintenanceList.jsx
import React, { useState, useEffect } from "react";
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
  Alert,
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
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext"; // Corrected Import Path

const recurrenceTypes = [
  { value: "days", label: "Day(s)" },
  { value: "weeks", label: "Week(s)" },
  { value: "months", label: "Month(s)" },
  { value: "years", label: "Year(s)" },
];

export default function MaintenanceList() {
  const { familyId } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [editingTask, setEditingTask] = useState(null);
  const [newTask, setNewTask] = useState({
    title: "",
    dueDate: null,
    isRecurring: false,
    recurrenceInterval: 1,
    recurrenceType: "months",
  });

  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      setTasks([]);
      return;
    }
    setLoading(true);
    setError(null);
    const tasksCollectionPath = `families/${familyId}/maintenanceTasks`;
    const q = query(
      collection(db, tasksCollectionPath),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const tasksData = [];
        querySnapshot.forEach((doc) => {
          tasksData.push({ ...doc.data(), id: doc.id });
        });
        tasksData.sort(
          (a, b) =>
            (a.dueDate?.toMillis() || Infinity) -
            (b.dueDate?.toMillis() || Infinity)
        );
        setTasks(tasksData);
        setLoading(false);
      },
      (err) => {
        console.error(
          `Error fetching maintenance tasks for family ${familyId}: `,
          err
        );
        setError("Failed to load maintenance tasks.");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [familyId]);

  const handleOpenModal = (taskToEdit = null) => {
    /* ... same ... */
    if (taskToEdit) {
      setEditingTask(taskToEdit);
      setNewTask({
        title: taskToEdit.title,
        dueDate: taskToEdit.dueDate ? taskToEdit.dueDate.toDate() : null,
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
    /* ... same, uses tasksCollectionPath ... */
    if (!familyId) {
      setError("Cannot save task: No family selected.");
      return;
    }
    if (!newTask.title.trim()) {
      setError("Task title cannot be empty.");
      return;
    }
    setLoading(true);
    setError(null);
    const tasksCollectionPath = `families/${familyId}/maintenanceTasks`;
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
      taskDataPayload.recurrenceInterval = null;
      taskDataPayload.recurrenceType = null;
    }
    try {
      if (editingTask && editingTask.id) {
        const taskRef = doc(db, tasksCollectionPath, editingTask.id);
        await updateDoc(taskRef, taskDataPayload);
      } else {
        await addDoc(collection(db, tasksCollectionPath), {
          ...taskDataPayload,
          createdAt: serverTimestamp(),
        });
      }
      close();
    } catch (err) {
      console.error("Error saving maintenance task: ", err);
      setError("Failed to save task.");
    }
    setLoading(false);
  };

  const deleteTaskFirestore = async (taskId) => {
    /* ... same, uses familyId in path ... */
    if (!familyId) {
      setError("Cannot delete task: No family selected.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    setLoading(true);
    setError(null);
    const taskRef = doc(db, `families/${familyId}/maintenanceTasks`, taskId);
    try {
      await deleteDoc(taskRef);
    } catch (err) {
      console.error("Error deleting maintenance task: ", err);
      setError("Failed to delete task.");
    }
    setLoading(false);
  };

  const markNonRecurringAsDone = async (taskId) =>
    await deleteTaskFirestore(taskId);

  const calculateNextDueDateFromToday = (interval, type) =>
    dayjs().add(interval, type).valueOf();

  const handleCompleteAndReschedule = async (taskToReschedule) => {
    /* ... same, uses familyId in path ... */
    if (!familyId || !taskToReschedule.isRecurring || !taskToReschedule.id)
      return;
    setLoading(true);
    setError(null);
    const nextDueDateMillis = calculateNextDueDateFromToday(
      taskToReschedule.recurrenceInterval,
      taskToReschedule.recurrenceType
    );
    const taskRef = doc(
      db,
      `families/${familyId}/maintenanceTasks`,
      taskToReschedule.id
    );
    try {
      await updateDoc(taskRef, {
        dueDate: Timestamp.fromMillis(nextDueDateMillis),
      });
    } catch (err) {
      console.error("Error rescheduling task: ", err);
      setError("Failed to reschedule task.");
    }
    setLoading(false);
  };

  const getDueDateBadge = (firestoreTimestamp) => {
    /* ... same ... */
    if (!firestoreTimestamp) return <Badge color="gray">No Date</Badge>;
    const date = dayjs(firestoreTimestamp.toDate());
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

  const rows = tasks.map((task /* ... same ... */) => (
    <Table.Tr key={task.id}>
      {" "}
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
      </Table.Td>{" "}
      <Table.Td>
        {getDueDateBadge(task.dueDate)}
        {task.dueDate && (
          <Text size="xs" c="dimmed" ml={task.dueDate ? "xs" : 0}>
            {dayjs(task.dueDate.toDate()).format("ddd, MMM D,gggg")}
          </Text>
        )}
      </Table.Td>{" "}
      <Table.Td>
        {" "}
        <Group gap="xs">
          {" "}
          {task.isRecurring ? (
            <ActionIcon
              variant="light"
              color="green"
              onClick={() => handleCompleteAndReschedule(task)}
              title={`Complete & Reschedule`}
            >
              <IconRefreshDot size={16} />
            </ActionIcon>
          ) : (
            <ActionIcon
              variant="light"
              color="green"
              onClick={() => markNonRecurringAsDone(task.id)}
              title="Mark as Done (deletes)"
            >
              <IconCheck size={16} />
            </ActionIcon>
          )}{" "}
          <ActionIcon
            variant="light"
            color="blue"
            onClick={() => handleOpenModal(task)}
            title="Edit Task"
          >
            <IconPencil size={16} />
          </ActionIcon>{" "}
          <ActionIcon
            variant="light"
            color="red"
            onClick={() => deleteTaskFirestore(task.id)}
            title="Delete Task"
          >
            <IconTrash size={16} />
          </ActionIcon>{" "}
        </Group>{" "}
      </Table.Td>{" "}
    </Table.Tr>
  ));

  if (!familyId && !loading) {
    return (
      <Paper p="lg" withBorder>
        <Text>
          Please create or join a family to use maintenance reminders.
        </Text>
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
            required
          />
          <DatePickerInput
            label="Due Date"
            placeholder="Pick a date"
            value={newTask.dueDate}
            onChange={(value) => setNewTask({ ...newTask, dueDate: value })}
            valueFormat="MMM D,gggg"
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
              {" "}
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
              />{" "}
              <Select
                label="Period"
                data={recurrenceTypes}
                value={newTask.recurrenceType}
                onChange={(value) =>
                  setNewTask({ ...newTask, recurrenceType: value || "months" })
                }
                allowDeselect={false}
              />{" "}
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
        {" "}
        <Title order={2}>Maintenance Reminders</Title>{" "}
        <Button
          onClick={() => handleOpenModal()}
          leftSection={<IconPlus size={18} />}
          disabled={!familyId || loading}
        >
          New Reminder
        </Button>{" "}
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
      ) : !loading && familyId ? (
        <Text c="dimmed" ta="center" mt="xl">
          No maintenance tasks for this family yet.
        </Text>
      ) : null}
    </Paper>
  );
}
