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
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { nanoid } from "nanoid";
import { useAuth } from "../../contexts/AuthContext"; // Import useAuth

// No longer a top-level collection name, will be nested under families.
// const SHOPPING_LISTS_COLLECTION = "shoppingLists";

export default function ShoppingList() {
  const { familyId } = useAuth(); // Get familyId from context
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [openedListModal, { open: openListModal, close: closeListModal }] =
    useDisclosure(false);
  const [openedItemModal, { open: openItemModal, close: closeItemModal }] =
    useDisclosure(false);

  const [currentListId, setCurrentListId] = useState(null);
  const [editingList, setEditingList] = useState(null);
  const [newListName, setNewListName] = useState("");

  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({ text: "", quantity: "", notes: "" });

  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      setLists([]); // Clear lists if no familyId
      // setError("No family selected to load shopping lists."); // Optional: user feedback
      return;
    }
    setLoading(true);
    setError(null);
    const listsCollectionPath = `families/${familyId}/shoppingLists`;
    const q = query(
      collection(db, listsCollectionPath),
      orderBy("createdAt", "asc")
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
        console.error(
          `Error fetching shopping lists for family ${familyId}: `,
          err
        );
        setError("Failed to load shopping lists.");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [familyId]); // Re-run if familyId changes

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
    if (!familyId) {
      setError("Cannot save list: No family selected.");
      return;
    }
    if (!newListName.trim()) {
      setError("List name cannot be empty.");
      return;
    }
    setLoading(true);
    setError(null);
    const listsCollectionPath = `families/${familyId}/shoppingLists`;
    try {
      if (editingList) {
        const listRef = doc(db, listsCollectionPath, editingList.id);
        await updateDoc(listRef, { name: newListName });
      } else {
        await addDoc(collection(db, listsCollectionPath), {
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
    if (!familyId) {
      setError("Cannot delete list: No family selected.");
      return;
    }
    if (
      window.confirm(
        "Are you sure you want to delete this list and all its items?"
      )
    ) {
      setLoading(true);
      setError(null);
      const listDocPath = `families/${familyId}/shoppingLists/${listId}`;
      try {
        await deleteDoc(doc(db, listDocPath));
      } catch (err) {
        console.error("Error deleting list: ", err);
        setError("Failed to delete list.");
      }
      setLoading(false);
    }
  };

  // Item Management
  const handleOpenItemModal = (listId, itemToEdit = null) => {
    setCurrentListId(listId); // This is the Firestore document ID of the list
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
    if (!familyId || !currentListId) {
      alert("Cannot save item: No family or list selected.");
      return;
    }
    if (!newItem.text.trim()) {
      alert("Item name cannot be empty.");
      return;
    }
    setLoading(true);
    const listRef = doc(
      db,
      `families/${familyId}/shoppingLists`,
      currentListId
    );
    try {
      const currentList = lists.find((l) => l.id === currentListId);
      if (!currentList) throw new Error("List not found locally");

      if (editingItem) {
        const itemToUpdate = currentList.items.find(
          (i) => i.id === editingItem.id
        );
        if (itemToUpdate) {
          // To edit an item in an array atomically: remove old, add new.
          // This is complex with arrayUnion/Remove if other fields besides the updated one should persist.
          // A simpler way for arrays is to read the doc, modify array in code, then overwrite the whole array.
          // However, for real-time, arrayUnion/Remove is often preferred for sub-object changes.
          // Let's try to replace the item in the array.
          const updatedItems = currentList.items.map((item) =>
            item.id === editingItem.id ? { ...itemToUpdate, ...newItem } : item
          );
          await updateDoc(listRef, { items: updatedItems });
        } else {
          throw new Error(
            "Editing item not found in local list state for update."
          );
        }
      } else {
        await updateDoc(listRef, {
          items: arrayUnion({ ...newItem, id: nanoid(8), done: false }),
        });
      }
      closeItemModal();
    } catch (err) {
      console.error("Error saving item: ", err);
      alert("Failed to save item.");
    }
    setLoading(false);
  };

  const toggleItemDone = async (listId, itemId) => {
    if (!familyId) return;
    setLoading(true);
    const listRef = doc(db, `families/${familyId}/shoppingLists`, listId);
    const currentList = lists.find((l) => l.id === listId);
    if (currentList) {
      const itemToToggle = currentList.items.find((i) => i.id === itemId);
      if (itemToToggle) {
        const updatedItems = currentList.items.map((item) =>
          item.id === itemId ? { ...item, done: !item.done } : item
        );
        try {
          await updateDoc(listRef, { items: updatedItems });
        } catch (err) {
          console.error("Error toggling item: ", err);
          alert("Failed to update item status.");
        }
      }
    }
    setLoading(false);
  };

  const deleteItem = async (listId, itemId) => {
    if (!familyId) return;
    setLoading(true);
    const listRef = doc(db, `families/${familyId}/shoppingLists`, listId);
    const currentList = lists.find((l) => l.id === listId);
    if (currentList) {
      const itemToDelete = currentList.items.find((i) => i.id === itemId);
      if (itemToDelete) {
        try {
          // For arrayRemove, you must pass the exact object to remove.
          await updateDoc(listRef, { items: arrayRemove(itemToDelete) });
        } catch (err) {
          console.error("Error deleting item: ", err);
          alert("Failed to delete item.");
        }
      }
    }
    setLoading(false);
  };

  if (!familyId && !loading) {
    return (
      <Paper p="lg" withBorder>
        <Text>Please create or join a family to use the shopping lists.</Text>
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
          disabled={!familyId || loading}
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
      ) : !loading && familyId ? (
        <Text c="dimmed" ta="center" mt="xl">
          No shopping lists yet for this family. Create one to get started!
        </Text>
      ) : null}
    </Paper>
  );
}
