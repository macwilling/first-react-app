// src/components/ShoppingList.jsx
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
  Checkbox,
  Text,
  Accordion,
  Box,
  Select,
  Textarea,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconPlus,
  IconTrash,
  IconPencil,
  IconShoppingCart,
} from "@tabler/icons-react";

const initialLists = [
  {
    id: "groceries",
    name: "Groceries",
    items: [
      { id: Date.now(), text: "Milk", notes: "", quantity: 1, done: false },
    ],
  },
  { id: "hardware", name: "Hardware Store", items: [] },
];

export default function ShoppingList({
  shoppingListsData,
  setShoppingListsData,
}) {
  const [lists, setLists] = useState(shoppingListsData || initialLists);
  const [openedListModal, { open: openListModal, close: closeListModal }] =
    useDisclosure(false);
  const [openedItemModal, { open: openItemModal, close: closeItemModal }] =
    useDisclosure(false);

  const [currentListId, setCurrentListId] = useState(null);
  const [editingList, setEditingList] = useState(null);
  const [newListName, setNewListName] = useState("");

  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({ text: "", quantity: 1, notes: "" });

  const handleListChange = (updatedLists) => {
    setLists(updatedLists);
    setShoppingListsData(updatedLists);
  };

  // List Management
  const handleOpenListModal = (listToEdit = null) => {
    if (listToEdit) {
      setEditingList(listToEdit);
      setNewListName(listToEdit.name);
    } else {
      setEditingList(null);
      setNewListName("");
    }
    openListModal();
  };

  const handleSubmitList = () => {
    if (editingList) {
      handleListChange(
        lists.map((list) =>
          list.id === editingList.id ? { ...list, name: newListName } : list
        )
      );
    } else {
      handleListChange([
        ...lists,
        { id: Date.now().toString(), name: newListName, items: [] },
      ]);
    }
    closeListModal();
  };

  const deleteList = (listId) => {
    handleListChange(lists.filter((list) => list.id !== listId));
  };

  // Item Management
  const handleOpenItemModal = (listId, itemToEdit = null) => {
    setCurrentListId(listId);
    if (itemToEdit) {
      setEditingItem(itemToEdit);
      setNewItem({
        text: itemToEdit.text,
        quantity: itemToEdit.quantity || 1,
        notes: itemToEdit.notes || "",
      });
    } else {
      setEditingItem(null);
      setNewItem({ text: "", quantity: 1, notes: "" });
    }
    openItemModal();
  };

  const handleSubmitItem = () => {
    const updatedLists = lists.map((list) => {
      if (list.id === currentListId) {
        let updatedItems;
        if (editingItem) {
          updatedItems = list.items.map((item) =>
            item.id === editingItem.id ? { ...editingItem, ...newItem } : item
          );
        } else {
          updatedItems = [
            ...list.items,
            { ...newItem, id: Date.now(), done: false },
          ];
        }
        return { ...list, items: updatedItems };
      }
      return list;
    });
    handleListChange(updatedLists);
    closeItemModal();
  };

  const toggleItemDone = (listId, itemId) => {
    const updatedLists = lists.map((list) => {
      if (list.id === listId) {
        const updatedItems = list.items.map((item) =>
          item.id === itemId ? { ...item, done: !item.done } : item
        );
        return { ...list, items: updatedItems };
      }
      return list;
    });
    handleListChange(updatedLists);
  };

  const deleteItem = (listId, itemId) => {
    const updatedLists = lists.map((list) => {
      if (list.id === listId) {
        return {
          ...list,
          items: list.items.filter((item) => item.id !== itemId),
        };
      }
      return list;
    });
    handleListChange(updatedLists);
  };

  return (
    <Paper shadow="md" p="lg" radius="md" withBorder>
      <Modal
        opened={openedListModal}
        onClose={closeListModal}
        title={editingList ? "Edit List Name" : "Add New Shopping List"}
        centered
      >
        <Stack>
          <TextInput
            label="List Name"
            placeholder="e.g., Groceries"
            value={newListName}
            onChange={(e) => setNewListName(e.currentTarget.value)}
            data-autofocus
          />
          <Button onClick={handleSubmitList} fullWidth mt="md">
            {editingList ? "Save Changes" : "Add List"}
          </Button>
        </Stack>
      </Modal>

      <Modal
        opened={openedItemModal}
        onClose={closeItemModal}
        title={editingItem ? "Edit Item" : "Add New Item"}
        centered
      >
        <Stack>
          <TextInput
            label="Item Name"
            placeholder="e.g., Apples"
            value={newItem.text}
            onChange={(e) =>
              setNewItem({ ...newItem, text: e.currentTarget.value })
            }
            data-autofocus
          />
          <TextInput
            label="Quantity"
            placeholder="e.g., 1 bag"
            value={newItem.quantity}
            onChange={(e) =>
              setNewItem({ ...newItem, quantity: e.currentTarget.value })
            }
          />
          <Textarea
            label="Notes (optional)"
            placeholder="e.g., Organic, specific brand"
            value={newItem.notes}
            onChange={(e) =>
              setNewItem({ ...newItem, notes: e.currentTarget.value })
            }
          />
          <Button onClick={handleSubmitItem} fullWidth mt="md">
            {editingItem ? "Save Changes" : "Add Item"}
          </Button>
        </Stack>
      </Modal>

      <Group justify="space-between" mb="xl">
        <Title order={2}>Shopping Lists</Title>
        <Button
          onClick={() => handleOpenListModal()}
          leftSection={<IconPlus size={18} />}
        >
          New List
        </Button>
      </Group>

      {lists.length > 0 ? (
        <Accordion defaultValue={lists[0]?.id}>
          {lists.map((list) => (
            <Accordion.Item key={list.id} value={list.id}>
              <Accordion.Control>
                <Group justify="space-between">
                  <Text fw={500}>{list.name}</Text>
                  <Group gap="xs">
                    <ActionIcon
                      variant="light"
                      color="blue"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenListModal(list);
                      }}
                    >
                      {" "}
                      <IconPencil size={14} />{" "}
                    </ActionIcon>
                    <ActionIcon
                      variant="light"
                      color="red"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteList(list.id);
                      }}
                    >
                      {" "}
                      <IconTrash size={14} />{" "}
                    </ActionIcon>
                  </Group>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => handleOpenItemModal(list.id)}
                  leftSection={<IconPlus size={14} />}
                  mb="sm"
                >
                  Add Item to {list.name}
                </Button>
                {list.items.length > 0 ? (
                  list.items.map((item) => (
                    <Paper
                      key={item.id}
                      p="xs"
                      mb="xs"
                      withBorder
                      radius="sm"
                      bg={item.done ? "gray.1" : "white"}
                    >
                      <Group justify="space-between">
                        <Checkbox
                          checked={item.done}
                          onChange={() => toggleItemDone(list.id, item.id)}
                          label={
                            <Box>
                              <Text strikethrough={item.done}>
                                {item.text}{" "}
                                {item.quantity && `(${item.quantity})`}
                              </Text>
                              {item.notes && (
                                <Text size="xs" c="dimmed">
                                  {item.notes}
                                </Text>
                              )}
                            </Box>
                          }
                        />
                        <Group gap="xs">
                          <ActionIcon
                            variant="subtle"
                            color="blue"
                            onClick={() => handleOpenItemModal(list.id, item)}
                          >
                            <IconPencil size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() => deleteItem(list.id, item.id)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Group>
                    </Paper>
                  ))
                ) : (
                  <Text size="sm" c="dimmed">
                    No items in this list yet.
                  </Text>
                )}
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      ) : (
        <Text c="dimmed" align="center" mt="xl">
          No shopping lists yet. Create one to get started!
        </Text>
      )}
    </Paper>
  );
}
