// src/components/RecipeBookPage.jsx
import React, { useState, useEffect } from "react";
import {
  Paper,
  Title,
  Button,
  Group,
  Text,
  LoadingOverlay,
  SimpleGrid,
  Card,
  ActionIcon,
  Menu,
  Badge,
  Alert,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconPlus,
  IconDotsVertical,
  IconPencil,
  IconTrash,
  IconAlertCircle,
} from "@tabler/icons-react";
import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
} from "firebase/firestore";
import AddEditRecipeModal from "./AddEditRecipeModal"; // Assumes this modal will be adapted
import { useAuth } from "../contexts/AuthContext"; // Import useAuth

// const RECIPES_COLLECTION = "recipes"; // Will be nested

export default function RecipeBookPage() {
  const { familyId } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);
  const [editingRecipe, setEditingRecipe] = useState(null);

  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      setRecipes([]);
      return;
    }
    setLoading(true);
    setError(null);
    const recipesCollectionPath = `families/${familyId}/recipes`;
    const q = query(
      collection(db, recipesCollectionPath),
      orderBy("createdAt", "desc") // Assuming createdAt exists, or order by title
    );
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const recipesData = [];
        querySnapshot.forEach((doc) => {
          recipesData.push({ ...doc.data(), id: doc.id });
        });
        setRecipes(recipesData);
        setLoading(false);
      },
      (err) => {
        console.error(`Error fetching recipes for family ${familyId}: `, err);
        setError("Failed to load recipes.");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [familyId]);

  const handleAddNewRecipe = () => {
    setEditingRecipe(null);
    openModal();
  };

  const handleEditRecipe = (recipe) => {
    setEditingRecipe(recipe);
    openModal();
  };

  const handleDeleteRecipe = async (recipeId) => {
    if (!familyId) {
      setError("Cannot delete recipe: No family selected.");
      return;
    }
    if (
      window.confirm(
        "Are you sure you want to delete this recipe? This action cannot be undone."
      )
    ) {
      setLoading(true);
      setError(null);
      const recipeDocPath = `families/${familyId}/recipes/${recipeId}`;
      try {
        await deleteDoc(doc(db, recipeDocPath));
      } catch (err) {
        console.error("Error deleting recipe: ", err);
        setError("Failed to delete recipe.");
      }
      setLoading(false);
    }
  };

  if (!familyId && !loading) {
    return (
      <Paper p="lg" withBorder>
        <Text>Please create or join a family to use the recipe book.</Text>
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
      <AddEditRecipeModal // This modal will also need access to familyId for saving
        opened={modalOpened}
        onClose={() => {
          closeModal();
          setEditingRecipe(null);
        }}
        recipeToEdit={editingRecipe}
        familyId={familyId} // Pass familyId to the modal
        key={editingRecipe ? `edit-${editingRecipe.id}` : "add-new-recipe"}
      />

      <Group justify="space-between" mb="xl">
        <Title order={2}>Recipe Book</Title>
        <Button
          onClick={handleAddNewRecipe}
          leftSection={<IconPlus size={18} />}
          disabled={!familyId || loading}
        >
          Add New Recipe
        </Button>
      </Group>

      {recipes.length > 0 ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {recipes.map((recipe) => (
            <Card
              key={recipe.id}
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
            >
              <Group justify="space-between" mb="xs">
                <Title order={4} truncate={true}>
                  {recipe.title || "Untitled Recipe"}
                </Title>
                <Menu
                  shadow="md"
                  width={200}
                  withinPortal
                  position="bottom-end"
                >
                  <Menu.Target>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      aria-label="Recipe options"
                    >
                      <IconDotsVertical size={16} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      leftSection={<IconPencil size={14} />}
                      onClick={() => handleEditRecipe(recipe)}
                    >
                      Edit
                    </Menu.Item>
                    <Menu.Item
                      color="red"
                      leftSection={<IconTrash size={14} />}
                      onClick={() => handleDeleteRecipe(recipe.id)}
                    >
                      Delete
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>

              {recipe.description && (
                <Text size="sm" c="dimmed" lineClamp={3} mt="xs">
                  {recipe.description}
                </Text>
              )}

              {recipe.tags &&
                Array.isArray(recipe.tags) &&
                recipe.tags.length > 0 && (
                  <Group gap="xs" mt="sm">
                    {recipe.tags.slice(0, 5).map((tag, index) => (
                      <Badge
                        key={`${recipe.id}-tag-${String(tag)}-${index}`}
                        variant="light"
                        size="sm"
                      >
                        {String(tag)}
                      </Badge>
                    ))}
                    {recipe.tags.length > 5 && (
                      <Badge variant="transparent" size="sm" color="gray">
                        ...
                      </Badge>
                    )}
                  </Group>
                )}

              <Text size="xs" c="dimmed" mt="md">
                {recipe.servings && `Serves: ${recipe.servings}`}
                {(recipe.prepTime || recipe.cookTime) &&
                  (recipe.servings ? ` | ` : ``)}
                {recipe.prepTime && `Prep: ${recipe.prepTime}`}
                {recipe.cookTime && recipe.prepTime && ` | `}
                {recipe.cookTime && `Cook: ${recipe.cookTime}`}
              </Text>
            </Card>
          ))}
        </SimpleGrid>
      ) : !loading && familyId ? (
        <Text c="dimmed" ta="center" mt="xl">
          No recipes found for this family. Add your first recipe!
        </Text>
      ) : null}
    </Paper>
  );
}
