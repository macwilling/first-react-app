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
  SegmentedControl,
} from "@mantine/core";
import { useForm, zodResolver } from "@mantine/form";
import { z } from "zod";
import {
  IconPlus,
  IconTrash,
  IconInfoCircle,
  IconSparkles,
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
import { nanoid } from "nanoid";

// --- Ingredient Parsing Logic ---
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
];
const SORTED_COMMON_UNITS = COMMON_UNITS.sort((a, b) => b.length - a.length);
const unitRegexFragment = SORTED_COMMON_UNITS.map((unit) =>
  unit.replace(/\s/g, "\\s*")
).join("|");

function normalizeUnicodeFractions(text) {
  if (!text) return "";
  return text
    .replace(/\u00BD/g, "1/2")
    .replace(/\u00BC/g, "1/4")
    .replace(/\u00BE/g, "3/4")
    .replace(/\u2153/g, "1/3")
    .replace(/\u2154/g, "2/3")
    .replace(/\u2155/g, "1/5")
    .replace(/\u2156/g, "2/5")
    .replace(/\u2157/g, "3/5")
    .replace(/\u2158/g, "4/5")
    .replace(/\u2159/g, "1/6")
    .replace(/\u215A/g, "5/6")
    .replace(/\u215B/g, "1/8")
    .replace(/\u215C/g, "3/8")
    .replace(/\u215D/g, "5/8")
    .replace(/\u215E/g, "7/8");
}

const quantityRegex = /^(\d+\s+\d\/\d|\d+-\d\/\d|\d+\/\d+|\d*\.\d+|\d+)\s*/;

function parseSingleIngredientLine(line) {
  const originalLine = line.trim();
  if (!originalLine) return null;
  let normalizedLine = normalizeUnicodeFractions(originalLine);

  let quantity = "";
  let unit = "";
  let name = normalizedLine;
  let processingLine = normalizedLine;
  let parseQuality = "poor";

  const quantityMatch = processingLine.match(quantityRegex);
  if (quantityMatch && quantityMatch[0]) {
    quantity = quantityMatch[0].trim();
    processingLine = processingLine.substring(quantityMatch[0].length).trim();
    parseQuality = "partial";
  }

  const unitMatchRegex = new RegExp(
    `^(${unitRegexFragment})(?:\\b|\\s|s\\b|s\\s)(.*)$`,
    "i"
  );
  const unitMatch = processingLine.match(unitMatchRegex);

  if (unitMatch && unitMatch[1]) {
    unit = unitMatch[1].trim().toLowerCase();
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
    name = unit;
    unit = "";
  }
  if (!name && (quantity || unit)) name = processingLine;
  else if (!name && !quantity && !unit && originalLine) name = originalLine;

  return {
    id: nanoid(8),
    quantity,
    unit,
    name,
    originalPastedLine: originalLine,
    parseQuality,
  };
}

export function parsePastedIngredients(textBlock) {
  if (!textBlock || !textBlock.trim()) return [];
  return textBlock
    .split("\n")
    .map((line) => parseSingleIngredientLine(line))
    .filter((ing) => ing && (ing.name || ing.quantity || ing.unit));
}
// --- End of Ingredient Parsing Logic ---

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
  pastedIngredients: z.string().optional(),
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
  pastedInstructions: z.string().optional(),
  instructions: z
    .array(z.string().min(1, { message: "Instruction step cannot be empty" }))
    .min(1, { message: "At least one instruction step is required" }),
  notes: z.string().optional(),
});

const RECIPES_COLLECTION = "recipes";

export default function AddEditRecipeModal({ opened, onClose, recipeToEdit }) {
  const [isProcessingIngredientsButton, setIsProcessingIngredientsButton] =
    useState(false);
  const [ingredientEntryMode, setIngredientEntryMode] = useState("paste");

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
    if (opened) {
      if (recipeToEdit) {
        form.setValues({
          title: recipeToEdit.title || "",
          sourceURL: recipeToEdit.sourceURL || "",
          description: recipeToEdit.description || "",
          servings: recipeToEdit.servings || "",
          prepTime: recipeToEdit.prepTime || "",
          cookTime: recipeToEdit.cookTime || "",
          tags: recipeToEdit.tags || [],
          ingredients: recipeToEdit.ingredients || [],
          instructions: recipeToEdit.instructions || [],
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
          notes: recipeToEdit.notes || "",
        });
        if (recipeToEdit.ingredients && recipeToEdit.ingredients.length > 0) {
          setIngredientEntryMode("structured");
        } else {
          setIngredientEntryMode("paste");
        }
      } else {
        form.reset();
        setIngredientEntryMode("paste");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeToEdit, opened]);

  const handleProcessPastedIngredients = () => {
    setIsProcessingIngredientsButton(true);
    const processed = parsePastedIngredients(form.values.pastedIngredients);
    form.setFieldValue("ingredients", processed);
    setIngredientEntryMode("structured");
    setIsProcessingIngredientsButton(false);
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
  };

  const handleSubmit = async (values) => {
    // --- START DIAGNOSTIC LOGS ---
    console.log(
      "handleSubmit: values received from form.onSubmit:",
      JSON.stringify(values, null, 2)
    );
    console.log(
      "handleSubmit: values.tags specifically:",
      JSON.stringify(values.tags, null, 2)
    );
    // --- END DIAGNOSTIC LOGS ---

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
    if (finalInstructions.length === 0 && values.pastedInstructions) {
      finalInstructions = values.pastedInstructions
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s);
      form.setFieldValue("instructions", finalInstructions);
    }

    let finalIngredients = values.ingredients;
    if (ingredientEntryMode === "paste" && values.pastedIngredients) {
      finalIngredients = parsePastedIngredients(values.pastedIngredients);
      form.setFieldValue("ingredients", finalIngredients);
    }

    const formStateForValidation = {
      ...values,
      instructions: finalInstructions,
      ingredients: finalIngredients,
    };
    const validationResult = form.validate(formStateForValidation);

    if (!validationResult.hasErrors) {
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
        ),
        instructions: finalInstructions,
        notes: values.notes,
      };

      // --- START DIAGNOSTIC LOG ---
      console.log(
        "handleSubmit: recipePayload being sent to Firestore:",
        JSON.stringify(recipePayload, null, 2)
      );
      // --- END DIAGNOSTIC LOG ---

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
        onClose();
        form.reset();
      } catch (error) {
        console.error("Error saving recipe:", error);
        form.setErrors({ submit: "Failed to save recipe. Please try again." });
      }
    } else {
      console.log("Form validation errors before submit:", form.errors);
    }
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

          {/* This is the MultiSelect configuration from your "Test 2" that allowed selection but failed on save */}
          <MultiSelect
            label="Tags (Optional)"
            placeholder="Select tags"
            data={["Sample Tag A", "Sample Tag B", "Sample Tag C"]} // Hardcoded data for this specific test
            searchable
            // creatable={false} // creatable is removed for this test
            // getCreateLabel={(query) => `+ Add tag: ${query}`} // getCreateLabel is removed for this test
            {...form.getInputProps("tags")}
          />

          <Paper withBorder p="sm" radius="sm">
            <Title order={5} mb="xs">
              Instructions
            </Title>
            <Textarea
              placeholder="Paste all instruction steps here, one per line. Each line will become a separate step."
              minRows={5}
              autosize
              {...form.getInputProps("pastedInstructions")}
              onBlur={handleProcessPastedInstructions}
            />
            {form.errors.instructions && (
              <Text c="red" size="xs" mt="xs">
                {form.errors.instructions}
              </Text>
            )}
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
                  loading={isProcessingIngredientsButton}
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
                        placeholder="cup, g"
                        searchable
                        creatable
                        getCreateLabel={(query) => `+ Add "${query}"`}
                        {...form.getInputProps(`ingredients.${index}.unit`)}
                        size="xs"
                        style={{ flex: 1.5 }}
                      />
                      <TextInput
                        label="Name"
                        placeholder="flour, sugar"
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
            <Button type="submit" loading={form.isSubmitting}>
              {recipeToEdit ? "Save Changes" : "Add Recipe"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
