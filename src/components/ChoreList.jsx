// src/components/ChoreList.jsx
import { useState } from "react";
import {
  Card,
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
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus, IconTrash, IconPencil } from "@tabler/icons-react";
import dayjs from "dayjs";

const family = ["Alice", "Bob", "Charlie", "Mom", "Dad"];
const familyColors = {
  // Optional: for avatar colors
  Alice: "pink",
  Bob: "indigo",
  Charlie: "cyan",
  Mom: "grape",
  Dad: "teal",
};

export default function ChoreList({ chores, setChores }) {
  const [opened, { open, close }] = useDisclosure(false);
  const [editingChore, setEditingChore] = useState(null); // For editing
  const [newChore, setNewChore] = useState({ title: "", assignedTo: "" });

  const handleOpenModal = (choreToEdit = null) => {
    if (choreToEdit) {
      setEditingChore(choreToEdit);
      setNewChore({
        title: choreToEdit.title,
        assignedTo: choreToEdit.assignedTo,
      });
    } else {
      setEditingChore(null);
      setNewChore({ title: "", assignedTo: "" });
    }
    open();
  };

  const handleSubmitChore = () => {
    if (editingChore) {
      setChores(
        chores.map((chore) =>
          chore.id === editingChore.id ? { ...chore, ...newChore } : chore
        )
      );
    } else {
      setChores([
        ...chores,
        {
          ...newChore,
          id: Date.now(),
          done: false,
          createdAt: new Date(),
          completedAt: null,
        },
      ]);
    }
    close();
  };

  const toggleDone = (id) => {
    setChores(
      chores.map((chore) =>
        chore.id === id
          ? {
              ...chore,
              done: !chore.done,
              completedAt: !chore.done ? new Date() : null,
            }
          : chore
      )
    );
  };

  const deleteChore = (id) => {
    setChores(chores.filter((chore) => chore.id !== id));
  };

  const rows = chores.map((chore) => (
    <Table.Tr key={chore.id} bg={chore.done ? "gray.1" : undefined}>
      <Table.Td>
        <Checkbox
          checked={chore.done}
          onChange={() => toggleDone(chore.id)}
          aria-label="Mark as done"
        />
      </Table.Td>
      <Table.Td>
        <Text fw={500} strikethrough={chore.done}>
          {chore.title}
        </Text>
        {chore.done && chore.completedAt && (
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
        {chore.done ? (
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
          >
            <IconPencil size={16} />
          </ActionIcon>
          <ActionIcon
            variant="light"
            color="red"
            onClick={() => deleteChore(chore.id)}
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
              setNewChore({ ...newChore, assignedTo: value })
            }
            allowDeselect={false}
          />
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
