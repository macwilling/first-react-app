// src/components/SelectRecipeModal.jsx
import { useState } from "react";
import {
  Modal,
  ScrollArea,
  TextInput,
  Paper,
  Text,
  Button,
  Group,
  Box,
} from "@mantine/core";
import dayjs from "dayjs";

export default function SelectRecipeModal({
  opened,
  onClose,
  recipes = [],
  onSelectRecipe,
  targetDate, // Changed from targetSlotInfo
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredRecipes = recipes.filter((recipe) =>
    recipe.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const modalTitle = targetDate
    ? `Select Recipe for ${dayjs(targetDate).format("ddd, MMM D")}`
    : "Select Recipe";

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={modalTitle}
      size="lg"
      overlayProps={{
        blur: 2,
      }}
      scrollAreaComponent={ScrollArea.Autosize}
      centered
    >
      <TextInput
        placeholder="Search recipes by title..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.currentTarget.value)}
        mb="md"
        data-autofocus
      />
      <Box
        style={{
          maxHeight: "60vh",
          overflowY: "auto",
          paddingRight: "var(--mantine-spacing-xs)",
        }}
      >
        {filteredRecipes.length > 0 ? (
          filteredRecipes.map((recipe) => (
            <Paper
              key={recipe.id}
              p="sm"
              mb="xs"
              shadow="xs"
              withBorder
              onClick={() => onSelectRecipe(recipe)} // onSelectRecipe expects the recipe object
              style={{ cursor: "pointer" }}
              sx={(theme) => ({
                "&:hover": {
                  backgroundColor:
                    theme.colorScheme === "dark"
                      ? theme.colors.dark[5]
                      : theme.colors.gray[0],
                },
              })}
            >
              <Text size="sm" fw={500} truncate>
                {recipe.title}
              </Text>
              {recipe.prepTime && (
                <Text size="xs" c="dimmed">
                  Prep: {recipe.prepTime}
                </Text>
              )}
            </Paper>
          ))
        ) : (
          <Text c="dimmed" ta="center" p="md">
            No recipes found matching your search.
          </Text>
        )}
        {recipes.length === 0 && !searchTerm && (
          <Text c="dimmed" ta="center" p="md">
            No recipes available.
          </Text>
        )}
      </Box>
      <Group justify="flex-end" mt="xl">
        <Button variant="default" onClick={onClose}>
          Cancel
        </Button>
      </Group>
    </Modal>
  );
}
