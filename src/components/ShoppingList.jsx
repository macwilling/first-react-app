// src/components/ShoppingList.jsx
import React, { useState, useEffect } from "react";
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
  Textarea,
  LoadingOverlay,
  Alert,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconPlus,
  IconTrash,
  IconPencil,
  IconAlertCircle,
} from "@tabler/icons-react";
import { db } from "../firebase"; // Your Firebase config
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
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { nanoid } from "nanoid"; // For unique item IDs within an array

const SHOPPING_LISTS_COLLECTION = "shoppingLists";

export default function ShoppingList() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [openedListModal, { open: openListModal, close: closeListModal }] =
    useDisclosure(false);
  const [openedItemModal, { open: openItemModal, close: closeItemModal }] =
    useDisclosure(false);

  const [currentListId, setCurrentListId] = useState(null); // Firestore document ID of the list
  const [editingList, setEditingList] = useState(null); // Full list object for editing
  const [newListName, setNewListName] = useState("");

  const [editingItem, setEditingItem] = useState(null); // Item object for editing
  const [newItem, setNewItem] = useState({ text: "", quantity: "", notes: "" });

  // Fetch Shopping Lists from Firestore
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, SHOPPING_LISTS_COLLECTION),
      orderBy("createdAt", "asc") // Or 'name'
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const listsData = [];
        querySnapshot.forEach((doc) => {
          listsData.push({ ...doc.data(), id: doc.id });
        });
        setLists(listsData);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching shopping lists: ", err);
        setError("Failed to load shopping lists.");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

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

  const handleSubmitList = async () => {
    if (!newListName.trim()) {
      setError("List name cannot be empty.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (editingList) {
        const listRef = doc(db, SHOPPING_LISTS_COLLECTION, editingList.id);
        await updateDoc(listRef, { name: newListName });
      } else {
        await addDoc(collection(db, SHOPPING_LISTS_COLLECTION), {
          name: newListName,
          items: [],
          createdAt: serverTimestamp(),
        });
      }
      closeListModal();
    } catch (err) {
      console.error("Error saving list: ", err);
      setError("Failed to save list.");
    }
    setLoading(false);
  };

  const deleteList = async (listId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this list and all its items?"
      )
    ) {
      setLoading(true);
      setError(null);
      try {
        await deleteDoc(doc(db, SHOPPING_LISTS_COLLECTION, listId));
      } catch (err) {
        console.error("Error deleting list: ", err);
        setError("Failed to delete list.");
      }
      setLoading(false);
    }
  };

  // Item Management
  const handleOpenItemModal = (listId, itemToEdit = null) => {
    setCurrentListId(listId);
    if (itemToEdit) {
      setEditingItem(itemToEdit);
      setNewItem({
        text: itemToEdit.text,
        quantity: itemToEdit.quantity || "",
        notes: itemToEdit.notes || "",
      });
    } else {
      setEditingItem(null);
      setNewItem({ text: "", quantity: "", notes: "" });
    }
    openItemModal();
  };

  const handleSubmitItem = async () => {
    if (!newItem.text.trim()) {
      // setError is not directly visible in item modal, consider modal-specific error state
      alert("Item name cannot be empty.");
      return;
    }
    setLoading(true); // Potentially use a different loading state for item operations
    const listRef = doc(db, SHOPPING_LISTS_COLLECTION, currentListId);
    try {
      if (editingItem) {
        // To edit an item in an array, we need to remove the old and add the new.
        // This requires finding the specific item in the current list's items array.
        const listDoc = lists.find((l) => l.id === currentListId);
        if (listDoc) {
          const itemToUpdate = listDoc.items.find(
            (i) => i.id === editingItem.id
          );
          if (itemToUpdate) {
            await updateDoc(listRef, {
              items: arrayRemove(itemToUpdate), // Remove the old item
            });
            await updateDoc(listRef, {
              items: arrayUnion({ ...itemToUpdate, ...newItem }), // Add the updated item
            });
          }
        }
      } else {
        await updateDoc(listRef, {
          items: arrayUnion({ ...newItem, id: nanoid(8), done: false }),
        });
      }
      closeItemModal();
    } catch (err) {
      console.error("Error saving item: ", err);
      // Consider modal-specific error display
      alert("Failed to save item.");
    }
    setLoading(false);
  };

  const toggleItemDone = async (listId, itemId) => {
    setLoading(true);
    const listRef = doc(db, SHOPPING_LISTS_COLLECTION, listId);
    const listDoc = lists.find((l) => l.id === listId);
    if (listDoc) {
      const itemToToggle = listDoc.items.find((i) => i.id === itemId);
      if (itemToToggle) {
        const updatedItem = { ...itemToToggle, done: !itemToToggle.done };
        try {
          await updateDoc(listRef, { items: arrayRemove(itemToToggle) });
          await updateDoc(listRef, { items: arrayUnion(updatedItem) });
        } catch (err) {
          console.error("Error toggling item: ", err);
          alert("Failed to update item status.");
        }
      }
    }
    setLoading(false);
  };

  const deleteItem = async (listId, itemId) => {
    setLoading(true);
    const listRef = doc(db, SHOPPING_LISTS_COLLECTION, listId);
    const listDoc = lists.find((l) => l.id === listId);
    if (listDoc) {
      const itemToDelete = listDoc.items.find((i) => i.id === itemId);
      if (itemToDelete) {
        try {
          await updateDoc(listRef, { items: arrayRemove(itemToDelete) });
        } catch (err) {
          console.error("Error deleting item: ", err);
          alert("Failed to delete item.");
        }
      }
    }
    setLoading(false);
  };

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
          <Button
            onClick={handleSubmitList}
            fullWidth
            mt="md"
            loading={loading}
          >
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
            label="Quantity / Details"
            placeholder="e.g., 1 bag, Whole wheat"
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
          <Button
            onClick={handleSubmitItem}
            fullWidth
            mt="md"
            loading={loading}
          >
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
        <Accordion defaultValue={lists[0]?.id} chevronPosition="left">
          {lists.map((list) => (
            <Accordion.Item key={list.id} value={list.id}>
              <Accordion.Control>
                <Group justify="space-between">
                  <Text fw={500}>{list.name}</Text>
                  <Group gap="xs">
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenListModal(list);
                      }}
                      title="Edit list name"
                    >
                      <IconPencil size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteList(list.id);
                      }}
                      title="Delete list"
                    >
                      <IconTrash size={16} />
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
                {list.items && list.items.length > 0 ? (
                  // Sort items: not done first, then by text
                  list.items
                    .sort((a, b) => {
                      if (a.done !== b.done) {
                        return a.done ? 1 : -1;
                      }
                      return a.text.localeCompare(b.text);
                    })
                    .map((item) => (
                      <Paper
                        key={item.id}
                        p="xs"
                        mb="xs"
                        withBorder
                        radius="sm"
                        bg={
                          item.done
                            ? "var(--mantine-color-gray-1)"
                            : "var(--mantine-color-body)"
                        }
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
                                  <Text
                                    size="xs"
                                    c="dimmed"
                                    style={{ whiteSpace: "pre-wrap" }}
                                  >
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
                              title="Edit item"
                            >
                              <IconPencil size={16} />
                            </ActionIcon>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              onClick={() => deleteItem(list.id, item.id)}
                              title="Delete item"
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Group>
                        </Group>
                      </Paper>
                    ))
                ) : (
                  <Text size="sm" c="dimmed" mt="sm">
                    No items in this list yet.
                  </Text>
                )}
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      ) : !loading ? (
        <Text c="dimmed" ta="center" mt="xl">
          No shopping lists yet. Create one to get started!
        </Text>
      ) : null}
    </Paper>
  );
}
