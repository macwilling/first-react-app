// src/components/RecipeBookPage.jsx
import { useState, useEffect } from "react";
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
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconPlus,
  IconDotsVertical,
  IconPencil,
  IconTrash,
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
import AddEditRecipeModal from "./AddEditRecipeModal";

const RECIPES_COLLECTION = "recipes";

export default function RecipeBookPage() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);
  const [editingRecipe, setEditingRecipe] = useState(null);

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, RECIPES_COLLECTION),
      orderBy("createdAt", "desc")
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
      (error) => {
        console.error("Error fetching recipes: ", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleAddNewRecipe = () => {
    setEditingRecipe(null);
    openModal();
  };

  const handleEditRecipe = (recipe) => {
    setEditingRecipe(recipe);
    openModal();
  };

  const handleDeleteRecipe = async (recipeId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this recipe? This action cannot be undone."
      )
    ) {
      setLoading(true);
      try {
        await deleteDoc(doc(db, RECIPES_COLLECTION, recipeId));
      } catch (error) {
        console.error("Error deleting recipe: ", error);
      }
      setLoading(false);
    }
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
        visible={loading}
        zIndex={1000}
        overlayProps={{ radius: "sm", blur: 2 }}
      />
      <AddEditRecipeModal
        opened={modalOpened}
        onClose={() => {
          closeModal();
          setEditingRecipe(null);
        }}
        recipeToEdit={editingRecipe}
        key={editingRecipe ? `edit-${editingRecipe.id}` : "add-new-recipe"}
      />

      <Group justify="space-between" mb="xl">
        <Title order={2}>Recipe Book</Title>
        <Button
          onClick={handleAddNewRecipe}
          leftSection={<IconPlus size={18} />}
        >
          Add New Recipe
        </Button>
      </Group>

      {recipes.length > 0 ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {recipes.map((recipe) => {
            // // Diagnostic logging for tags (can be removed once tag issues are fully resolved)
            // if (recipe.tags && recipe.tags.length > 0) {
            //   console.log(`Rendering tags for recipe "${recipe.title}":`, recipe.tags);
            //   recipe.tags.forEach((tag, index) => {
            //     console.log(`  Tag ${index}:`, tag, `(type: ${typeof tag})`);
            //   });
            // }

            return (
              <Card
                key={recipe.id}
                shadow="sm"
                padding="lg"
                radius="md"
                withBorder
              >
                <Group justify="space-between" mb="xs">
                  <Title order={4} truncate="true">
                    {" "}
                    {/* CORRECTED: truncate="true" */}
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

                {/* Tag rendering removed as per your request to simplify and move past tag errors */}
                {/* {recipe.tags && Array.isArray(recipe.tags) && recipe.tags.length > 0 && (
                  <Group gap="xs" mt="sm">
                    {recipe.tags.slice(0, 5).map((tag, index) => {
                      if (typeof tag === 'string' || typeof tag === 'number') {
                        return <Badge key={`${recipe.id}-tag-${String(tag)}-${index}`} variant="light" size="sm">{String(tag)}</Badge>;
                      }
                      console.warn(`Skipping non-string/non-number tag for recipe "${recipe.title || 'Untitled'}":`, tag);
                      return null;
                    })}
                    {recipe.tags.length > 5 && <Badge variant="transparent" size="sm" color="gray">...</Badge>}
                  </Group>
                )} */}

                <Text size="xs" c="dimmed" mt="md">
                  {recipe.servings && `Serves: ${recipe.servings}`}
                  {(recipe.prepTime || recipe.cookTime) &&
                    (recipe.servings ? ` | ` : ``)}
                  {recipe.prepTime && `Prep: ${recipe.prepTime}`}
                  {recipe.cookTime && recipe.prepTime && ` | `}
                  {recipe.cookTime && `Cook: ${recipe.cookTime}`}
                </Text>
              </Card>
            );
          })}
        </SimpleGrid>
      ) : !loading ? (
        <Text c="dimmed" align="center" mt="xl">
          No recipes found. Add your first recipe to get started!
        </Text>
      ) : null}
    </Paper>
  );
}
