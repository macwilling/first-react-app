// src/components/MaintenanceList.jsx
import { useState } from "react";
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
} from "@tabler/icons-react";

const recurrenceTypes = [
  { value: "days", label: "Day(s)" },
  { value: "weeks", label: "Week(s)" },
  { value: "months", label: "Month(s)" },
  { value: "years", label: "Year(s)" },
];

export default function MaintenanceList({ tasks, setTasks }) {
  const [opened, { open, close }] = useDisclosure(false);
  const [editingTask, setEditingTask] = useState(null);
  const [newTask, setNewTask] = useState({
    title: "",
    dueDate: null,
    isRecurring: false,
    recurrenceInterval: 1,
    recurrenceType: "months",
  });

  const handleOpenModal = (taskToEdit = null) => {
    if (taskToEdit) {
      setEditingTask(taskToEdit);
      setNewTask({
        title: taskToEdit.title,
        dueDate: taskToEdit.dueDate ? new Date(taskToEdit.dueDate) : null,
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

  const handleSubmitTask = () => {
    const taskData = {
      ...newTask,
      dueDate: newTask.dueDate ? dayjs(newTask.dueDate).valueOf() : null,
    };
    if (!newTask.isRecurring) {
      delete taskData.recurrenceInterval;
      delete taskData.recurrenceType;
    }

    if (editingTask) {
      setTasks(
        tasks.map((task) =>
          task.id === editingTask.id ? { ...task, ...taskData } : task
        )
      );
    } else {
      setTasks([...tasks, { ...taskData, id: Date.now() }]);
    }
    close();
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter((task) => task.id !== id));
  };

  // Updated to calculate from today's date
  const calculateNextDueDateFromToday = (interval, type) => {
    return dayjs().add(interval, type).valueOf();
  };

  const handleCompleteAndReschedule = (taskToReschedule) => {
    if (taskToReschedule.isRecurring) {
      // No longer checking if taskToReschedule.dueDate exists
      const nextDueDate = calculateNextDueDateFromToday(
        // Using new function
        taskToReschedule.recurrenceInterval,
        taskToReschedule.recurrenceType
      );
      setTasks(
        tasks.map((task) =>
          task.id === taskToReschedule.id
            ? { ...task, dueDate: nextDueDate }
            : task
        )
      );
    }
  };

  const getDueDateBadge = (dueDate) => {
    if (!dueDate) return <Badge color="gray">No Date</Badge>;
    const today = dayjs().startOf("day");
    const date = dayjs(dueDate).startOf("day");
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

  const rows = tasks
    .sort((a, b) => (a.dueDate || Infinity) - (b.dueDate || Infinity))
    .map((task) => (
      <Table.Tr key={task.id}>
        <Table.Td>
          <Group gap="xs">
            {task.isRecurring && <IconRepeat size={16} color="gray" />}
            <Text fw={500}>{task.title}</Text>
          </Group>
        </Table.Td>
        <Table.Td>
          {getDueDateBadge(task.dueDate)}
          {task.dueDate && (
            <Text size="xs" c="dimmed" ml={task.dueDate ? "xs" : 0}>
              {dayjs(task.dueDate).format("ddd, MMM D, YYYY")}
            </Text>
          )}
        </Table.Td>
        <Table.Td>
          <Group gap="xs">
            {/* Show for ALL recurring tasks */}
            {task.isRecurring && (
              <ActionIcon
                variant="light"
                color="green"
                onClick={() => handleCompleteAndReschedule(task)}
                title={`Complete & Reschedule (next: today + ${task.recurrenceInterval} ${task.recurrenceType})`}
              >
                <IconRefreshDot size={16} />
              </ActionIcon>
            )}
            <ActionIcon
              variant="light"
              color="blue"
              onClick={() => handleOpenModal(task)}
            >
              <IconPencil size={16} />
            </ActionIcon>
            <ActionIcon
              variant="light"
              color="red"
              onClick={() => deleteTask(task.id)}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        </Table.Td>
      </Table.Tr>
    ));

  return (
    <Paper shadow="md" p="lg" radius="md" withBorder>
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
          <Button onClick={handleSubmitTask} fullWidth mt="md">
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

      {/* Table for tasks - no changes here from previous version with recurrence */}
      {tasks.length > 0 ? (
        <Box style={{ overflowX: "auto" }}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Title</Table.Th>
                <Table.Th>Due Date</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        </Box>
      ) : (
        <Text c="dimmed" align="center" mt="xl">
          No maintenance tasks yet. Add some reminders!
        </Text>
      )}
    </Paper>
  );
}
