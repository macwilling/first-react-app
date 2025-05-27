// src/components/AddEditRecipeModal.jsx
import { useState, useEffect } from "react";
import {
  Modal,
  Button,
  Stack,
  TextInput,
  Textarea,
  Group,
  ActionIcon,
  Paper,
  Title,
  Select,
  NumberInput,
  MultiSelect,
  Alert,
  Collapse,
  Tooltip,
  SegmentedControl, // For switching between paste & structured ingredients
} from "@mantine/core";
import { useForm, zodResolver } from "@mantine/form"; // For robust validation
import { z } from "zod"; // For schema validation
import {
  IconPlus,
  IconTrash,
  IconInfoCircle,
  IconSparkles,
  IconClipboardText,
} from "@tabler/icons-react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { nanoid } from "nanoid"; // For generating unique IDs for ingredients

// --- Ingredient Parsing Logic (from previous discussion, can be moved to a util file) ---
const COMMON_UNITS = [
  "cup",
  "cups",
  "c",
  "oz",
  "ounce",
  "ounces",
  "fl oz",
  "fluid ounce",
  "fluid ounces",
  "tbsp",
  "tablespoon",
  "tablespoons",
  "tsp",
  "teaspoon",
  "teaspoons",
  "g",
  "gram",
  "grams",
  "kg",
  "kilogram",
  "kilograms",
  "kilo",
  "kilos",
  "lb",
  "lbs",
  "pound",
  "pounds",
  "ml",
  "milliliter",
  "milliliters",
  "millilitre",
  "millilitres",
  "l",
  "liter",
  "liters",
  "litre",
  "litres",
  "pt",
  "pint",
  "pints",
  "qt",
  "quart",
  "quarts",
  "gal",
  "gallon",
  "gallons",
  "pinch",
  "pinches",
  "dash",
  "dashes",
  "clove",
  "cloves",
  "can",
  "cans",
  "pkg",
  "package",
  "packages",
  "bunch",
  "bunches",
  "slice",
  "slices",
  "sprig",
  "sprigs",
  "stalk",
  "stalks",
  "head",
  "heads",
  "ear",
  "ears",
  "sheet",
  "sheets",
  "bottle",
  "bottles",
  "bar",
  "bars",
  "piece",
  "pieces",
  // Add more units, consider those that might be part of a name like "large", "medium", "small"
];
const SORTED_COMMON_UNITS = COMMON_UNITS.sort((a, b) => b.length - a.length);
const unitRegexFragment = SORTED_COMMON_UNITS.map((unit) =>
  unit.replace(/\s/g, "\\s*")
).join("|");
const quantityRegex = /^(\d+\s+\d\/\d|\d+-\d\/\d|\d+\/\d+|\d*\.\d+|\d+)\s*/;

function parseSingleIngredientLine(line) {
  line = line.trim();
  if (!line) return null;

  let quantity = "";
  let unit = "";
  let name = line;
  let processingLine = line;
  let parseQuality = "poor"; // 'good', 'partial' (qty+name), 'poor' (only name)

  const quantityMatch = processingLine.match(quantityRegex);
  if (quantityMatch) {
    quantity = quantityMatch[1].trim();
    processingLine = processingLine.substring(quantityMatch[0].length).trim();
    parseQuality = "partial";
  }

  const unitMatchRegex = new RegExp(
    `^(${unitRegexFragment})(?:\\b|\\s|s\\b|s\\s)(.*)$`,
    "i"
  ); // Added plural 's' handling
  const unitMatch = processingLine.match(unitMatchRegex);

  if (unitMatch && unitMatch[1]) {
    unit = unitMatch[1].trim().toLowerCase();
    // Normalize units (e.g., "cups" to "cup")
    const unitMappings = {
      cups: "cup",
      ounces: "oz",
      tablespoons: "tbsp",
      teaspoons: "tsp",
      grams: "g",
      kilograms: "kg",
      pounds: "lb",
      milliliters: "ml",
      liters: "l",
      packages: "pkg",
    };
    unit = unitMappings[unit] || unit;
    name = unitMatch[unitMatch.length - 1].trim();
    if (quantity) parseQuality = "good";
  } else {
    name = processingLine;
  }
  name = name
    .replace(/^of\s+/i, "")
    .replace(/,$/, "")
    .trim();
  if (name.length === 0 && quantity && unit) {
    // If name becomes empty but we have qty/unit, move unit to name
    name = unit;
    unit = "";
  }
  if (!name && !quantity && !unit && line) name = line; // If all else fails, name is the original line

  return {
    id: nanoid(8),
    quantity,
    unit,
    name,
    originalPastedLine: line,
    parseQuality,
  };
}

export function parsePastedIngredients(textBlock) {
  if (!textBlock || !textBlock.trim()) return [];
  return textBlock
    .split("\n")
    .map((line) => parseSingleIngredientLine(line.trim()))
    .filter((ing) => ing && (ing.name || ing.quantity || ing.unit));
}
// --- End of Ingredient Parsing Logic ---

// Zod schema for validation
const recipeSchema = z.object({
  title: z.string().min(1, { message: "Recipe title is required" }),
  sourceURL: z
    .string()
    .url({ message: "Must be a valid URL" })
    .optional()
    .or(z.literal("")),
  description: z.string().optional(),
  servings: z.string().optional(),
  prepTime: z.string().optional(),
  cookTime: z.string().optional(),
  tags: z.array(z.string()).optional(),
  pastedIngredients: z.string().optional(), // For the textarea
  ingredients: z
    .array(
      z.object({
        id: z.string(),
        quantity: z.string().optional(),
        unit: z.string().optional(),
        name: z.string().min(1, { message: "Ingredient name is required" }),
        originalPastedLine: z.string().optional(),
        parseQuality: z.string().optional(),
      })
    )
    .min(1, { message: "At least one ingredient is required" }),
  pastedInstructions: z.string().optional(), // For the textarea
  instructions: z
    .array(z.string().min(1, { message: "Instruction step cannot be empty" }))
    .min(1, { message: "At least one instruction step is required" }),
  notes: z.string().optional(),
});

const RECIPES_COLLECTION = "recipes";

export default function AddEditRecipeModal({ opened, onClose, recipeToEdit }) {
  const [isProcessingIngredients, setIsProcessingIngredients] = useState(false);
  const [ingredientEntryMode, setIngredientEntryMode] = useState("paste"); // 'paste' or 'structured'

  const form = useForm({
    initialValues: {
      title: "",
      sourceURL: "",
      description: "",
      servings: "",
      prepTime: "",
      cookTime: "",
      tags: [],
      pastedIngredients: "",
      ingredients: [],
      pastedInstructions: "",
      instructions: [],
      notes: "",
    },
    validate: zodResolver(recipeSchema),
  });

  useEffect(() => {
    if (recipeToEdit) {
      form.setValues({
        ...recipeToEdit,
        tags: recipeToEdit.tags || [],
        ingredients: recipeToEdit.ingredients || [], // Should be structured
        instructions: recipeToEdit.instructions || [], // Should be array of strings
        pastedIngredients:
          recipeToEdit.ingredients
            ?.map(
              (ing) =>
                ing.originalPastedLine ||
                `${ing.quantity || ""} ${ing.unit || ""} ${
                  ing.name || ""
                }`.trim()
            )
            .join("\n") || "",
        pastedInstructions: recipeToEdit.instructions?.join("\n") || "",
      });
      // If loading an existing recipe with structured ingredients, switch to structured view
      if (recipeToEdit.ingredients && recipeToEdit.ingredients.length > 0) {
        setIngredientEntryMode("structured");
      } else {
        setIngredientEntryMode("paste");
      }
    } else {
      form.reset();
      setIngredientEntryMode("paste");
    }
  }, [recipeToEdit, opened]); // Re-initialize form when modal opens or recipeToEdit changes

  const handleProcessPastedIngredients = () => {
    const processed = parsePastedIngredients(form.values.pastedIngredients);
    form.setFieldValue("ingredients", processed);
    setIngredientEntryMode("structured"); // Switch to structured view for editing
  };

  const handleAddIngredientRow = () => {
    form.insertListItem("ingredients", {
      id: nanoid(8),
      quantity: "",
      unit: "",
      name: "",
      originalPastedLine: "",
      parseQuality: "good",
    });
  };

  const handleProcessPastedInstructions = () => {
    const steps = form.values.pastedInstructions
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s);
    form.setFieldValue("instructions", steps);
    // Could also switch to a view of listed steps, but for now, direct save is okay
  };

  const handleSubmit = async (values) => {
    setIsProcessingIngredients(true); // Show loading on save button

    // Ensure instructions are processed if still in paste mode
    let finalInstructions = values.instructions;
    if (
      values.pastedInstructions &&
      (!values.instructions || values.instructions.length === 0)
    ) {
      finalInstructions = values.pastedInstructions
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s);
    }
    // Ensure ingredients are structured
    let finalIngredients = values.ingredients;
    if (ingredientEntryMode === "paste" && values.pastedIngredients) {
      finalIngredients = parsePastedIngredients(values.pastedIngredients);
    }

    const recipePayload = {
      title: values.title,
      sourceURL: values.sourceURL,
      description: values.description,
      servings: values.servings,
      prepTime: values.prepTime,
      cookTime: values.cookTime,
      tags: values.tags || [],
      ingredients: finalIngredients.map(
        ({ id, parseQuality, originalPastedLine, ...ing }) => ing
      ), // Remove transient fields
      instructions: finalInstructions,
      notes: values.notes,
    };

    try {
      if (recipeToEdit && recipeToEdit.id) {
        await updateDoc(
          doc(db, RECIPES_COLLECTION, recipeToEdit.id),
          recipePayload
        );
      } else {
        await addDoc(collection(db, RECIPES_COLLECTION), {
          ...recipePayload,
          createdAt: serverTimestamp(),
        });
      }
      onClose(); // Close modal on success
      form.reset();
    } catch (error) {
      console.error("Error saving recipe:", error);
      form.setErrors({ submit: "Failed to save recipe. Please try again." }); // Example of form-level error
    }
    setIsProcessingIngredients(false);
  };

  return (
    <Modal
      opened={opened}
      onClose={() => {
        form.reset();
        onClose();
      }}
      title={recipeToEdit ? "Edit Recipe" : "Add New Recipe"}
      size="xl"
      overlayProps={{ blur: 2 }}
      // closeOnClickOutside={false} // Optional: prevent closing on click outside if form is complex
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Recipe Title"
            placeholder="e.g., Grandma's Apple Pie"
            required
            {...form.getInputProps("title")}
          />
          <TextInput
            label="Source URL (Optional)"
            placeholder="https://www.example.com/recipe"
            type="url"
            {...form.getInputProps("sourceURL")}
          />
          <Textarea
            label="Description (Optional)"
            placeholder="A brief summary of the recipe"
            minRows={2}
            {...form.getInputProps("description")}
          />
          <Group grow>
            <TextInput
              label="Servings (Optional)"
              placeholder="e.g., 4-6"
              {...form.getInputProps("servings")}
            />
            <TextInput
              label="Prep Time (Optional)"
              placeholder="e.g., 20 mins"
              {...form.getInputProps("prepTime")}
            />
            <TextInput
              label="Cook Time (Optional)"
              placeholder="e.g., 45 mins"
              {...form.getInputProps("cookTime")}
            />
          </Group>
          <MultiSelect
            data={[]} // Provide an empty array for suggestions
            label="Tags (Optional)"
            placeholder="e.g., dessert, quick, vegan"
            searchable
            creatable
            getCreateLabel={(query) => `+ Add tag: ${query}`}
            {...form.getInputProps("tags")}
          />
          {/* Instructions Input */}
          <Paper withBorder p="sm" radius="sm">
            <Title order={5} mb="xs">
              Instructions
            </Title>
            <Textarea
              placeholder="Paste all instruction steps here, one per line. Each line will become a separate step."
              minRows={5}
              autosize
              {...form.getInputProps("pastedInstructions")}
              onBlur={handleProcessPastedInstructions} // Process when user tabs out
            />
            {form.errors.instructions && (
              <Text c="red" size="xs" mt="xs">
                {form.errors.instructions}
              </Text>
            )}
            {/* Optionally, display processed steps for confirmation */}
            {form.values.instructions.length > 0 &&
              form.values.pastedInstructions && (
                <Button
                  variant="light"
                  size="xs"
                  mt="xs"
                  onClick={handleProcessPastedInstructions}
                >
                  Re-process Pasted Instructions
                </Button>
              )}
          </Paper>

          {/* Ingredients Input */}
          <Paper withBorder p="sm" radius="sm">
            <Group justify="space-between" align="center" mb="xs">
              <Title order={5}>Ingredients</Title>
              <SegmentedControl
                size="xs"
                value={ingredientEntryMode}
                onChange={setIngredientEntryMode}
                data={[
                  { label: "Paste List", value: "paste" },
                  { label: "Edit Structured", value: "structured" },
                ]}
              />
            </Group>

            {ingredientEntryMode === "paste" && (
              <>
                <Textarea
                  placeholder="Paste all ingredients here, one ingredient per line. e.g., '1 cup flour', '2 large eggs', 'Salt to taste'"
                  minRows={5}
                  autosize
                  {...form.getInputProps("pastedIngredients")}
                />
                <Button
                  onClick={handleProcessPastedIngredients}
                  leftSection={<IconSparkles size={16} />}
                  mt="sm"
                  variant="light"
                >
                  Process & Edit Ingredients
                </Button>
              </>
            )}

            <Collapse in={ingredientEntryMode === "structured"}>
              <Stack gap="xs" mt="sm">
                {form.values.ingredients.map((ing, index) => (
                  <Paper
                    key={ing.id}
                    p="xs"
                    withBorder
                    radius="xs"
                    style={{
                      borderColor:
                        ing.parseQuality === "poor" && !ing.name
                          ? "red"
                          : undefined,
                    }}
                  >
                    <Group grow align="flex-end">
                      <TextInput
                        label="Qty"
                        placeholder="1, 1/2"
                        {...form.getInputProps(`ingredients.${index}.quantity`)}
                        size="xs"
                        style={{ flex: 1 }}
                      />
                      <Select
                        label="Unit"
                        data={COMMON_UNITS.map((u) => ({ value: u, label: u }))}
                        placeholder="cup, g, tbsp"
                        searchable
                        creatable
                        getCreateLabel={(query) => `+ Add "${query}"`}
                        {...form.getInputProps(`ingredients.${index}.unit`)}
                        size="xs"
                        style={{ flex: 1.5 }}
                      />
                      <TextInput
                        label="Name"
                        placeholder="flour, sugar, chicken breast"
                        required
                        {...form.getInputProps(`ingredients.${index}.name`)}
                        error={form.errors[`ingredients.${index}.name`]}
                        size="xs"
                        style={{ flex: 3 }}
                      />
                      <ActionIcon
                        color="red"
                        onClick={() =>
                          form.removeListItem("ingredients", index)
                        }
                        variant="subtle"
                        title="Remove ingredient"
                      >
                        <IconTrash size={18} />
                      </ActionIcon>
                    </Group>
                    {ing.parseQuality === "poor" && !ing.name && (
                      <Text c="red" size="xs" mt={2}>
                        Ingredient name seems missing or unparsed.
                      </Text>
                    )}
                  </Paper>
                ))}
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={handleAddIngredientRow}
                  variant="light"
                  size="xs"
                  mt="xs"
                >
                  Add Ingredient Manually
                </Button>
              </Stack>
            </Collapse>
            {form.errors.ingredients &&
              typeof form.errors.ingredients === "string" && (
                <Text c="red" size="xs" mt="xs">
                  {form.errors.ingredients}
                </Text>
              )}
          </Paper>

          <Textarea
            label="Recipe Notes (Optional)"
            placeholder="Any extra tips or variations"
            minRows={3}
            {...form.getInputProps("notes")}
          />

          {form.errors.submit && (
            <Alert color="red" title="Save Error" icon={<IconInfoCircle />}>
              {form.errors.submit}
            </Alert>
          )}

          <Group justify="flex-end" mt="md">
            <Button
              variant="default"
              onClick={() => {
                form.reset();
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isProcessingIngredients}>
              {recipeToEdit ? "Save Changes" : "Add Recipe"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
