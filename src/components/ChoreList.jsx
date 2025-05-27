// src/components/ChoreList.jsx
import { useState } from "react";
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
  MultiSelect, // Added
  NumberInput, // Added
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconPlus,
  IconTrash,
  IconPencil,
  IconRepeat,
} from "@tabler/icons-react"; // Added IconRepeat
import dayjs from "dayjs";

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
  // { value: 'monthly', label: 'Monthly' }, // Can add later
];

const daysOfWeek = [
  { value: "0", label: "Sunday" }, // dayjs().day() Sunday is 0
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

export default function ChoreList({ chores, setChores }) {
  const [opened, { open, close }] = useDisclosure(false);
  const [editingChore, setEditingChore] = useState(null);
  const [newChore, setNewChore] = useState({
    title: "",
    assignedTo: "",
    isRecurring: false,
    recurrenceType: "daily", // Default recurrence
    recurrenceInterval: 1, // Default interval (e.g., every 1 day/week)
    recurrenceDays: [], // For weekly recurrence, stores selected days [ "0", "1", ... "6" ]
  });

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
        assignedTo: family[0] || "", // Default to first family member
        isRecurring: false,
        recurrenceType: "daily",
        recurrenceInterval: 1,
        recurrenceDays: [],
      });
    }
    open();
  };

  const handleSubmitChore = () => {
    const choreData = { ...newChore };
    if (!choreData.isRecurring) {
      delete choreData.recurrenceType;
      delete choreData.recurrenceInterval;
      delete choreData.recurrenceDays;
    } else {
      // Ensure interval is at least 1
      choreData.recurrenceInterval = Math.max(
        1,
        Number(choreData.recurrenceInterval) || 1
      );
      // If not weekly, clear recurrenceDays
      if (choreData.recurrenceType !== "weekly") {
        choreData.recurrenceDays = [];
      }
    }

    if (editingChore) {
      setChores(
        chores.map((chore) =>
          chore.id === editingChore.id ? { ...chore, ...choreData } : chore
        )
      );
    } else {
      setChores([
        ...chores,
        {
          ...choreData,
          id: Date.now(),
          done: false,
          createdAt: new Date().valueOf(), // Store as timestamp
          completedAt: null,
        },
      ]);
    }
    close();
  };

  const toggleDone = (id) => {
    setChores(
      chores.map((chore) => {
        if (chore.id === id) {
          const isNowDone = !chore.done;
          if (isNowDone && chore.isRecurring) {
            // For recurring chores: mark done, then immediately reset for next occurrence
            return {
              ...chore,
              done: false, // Reset for next time
              completedAt: null, // Reset completedAt (or log this completion elsewhere)
              // We could add a 'lastCompletedAt' field if we want to track the actual completion
              // and base the next recurrence on that, but this is simpler for now.
              // It just becomes available again immediately.
            };
          }
          // For non-recurring, or when unchecking a recurring chore (making it pending)
          return {
            ...chore,
            done: isNowDone,
            completedAt: isNowDone ? new Date().valueOf() : null,
          };
        }
        return chore;
      })
    );
  };

  const deleteChore = (id) => {
    setChores(chores.filter((chore) => chore.id !== id));
  };

  const rows = chores.map((chore) => (
    <Table.Tr
      key={chore.id}
      bg={chore.done && !chore.isRecurring ? "gray.1" : undefined}
    >
      <Table.Td>
        <Checkbox
          checked={chore.done}
          onChange={() => toggleDone(chore.id)}
          aria-label="Mark as done"
        />
      </Table.Td>
      <Table.Td>
        <Group gap="xs">
          {chore.isRecurring && <IconRepeat size={16} color="gray" />}
          <Text fw={500} strikethrough={chore.done && !chore.isRecurring}>
            {" "}
            {/* Only strikethrough non-recurring */}
            {chore.title}
          </Text>
        </Group>
        {chore.done &&
          chore.completedAt &&
          !chore.isRecurring && ( // Show completion only for non-recurring
            <Text size="xs" c="dimmed">
              Completed: {dayjs(chore.completedAt).format("MMM D, h:mm A")}
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
        {chore.done && !chore.isRecurring ? ( // "Done" status primarily for non-recurring
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
    <Paper shadow="md" p="lg" radius="md" withBorder>
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
          <Button onClick={handleSubmitChore} fullWidth mt="md">
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
                <Table.Th style={{ width: 40 }} />
                <Table.Th>Title</Table.Th>
                <Table.Th>Assigned To</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        </Box>
      ) : (
        <Text c="dimmed" align="center" mt="xl">
          No chores yet. Add some to get started!
        </Text>
      )}
    </Paper>
  );
}
