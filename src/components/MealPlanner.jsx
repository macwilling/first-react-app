// src/components/MealPlanner.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Grid,
  Paper,
  Title,
  Group,
  Button,
  TextInput,
  ScrollArea,
  Text,
  ActionIcon,
  Box,
  useMantineTheme,
  LoadingOverlay,
  Alert, // Added for error display
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  IconChevronLeft,
  IconChevronRight,
  IconCalendarEvent,
  IconPlus,
  IconTrash,
  IconAlertCircle, // Added for error display
} from "@tabler/icons-react";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import isoWeek from "dayjs/plugin/isoWeek";

// Firebase imports: db from your firebase.js, specific functions from firestore
import { db } from "../firebase"; // Correctly points to src/firebase.js
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  serverTimestamp,
  // getDoc, // No longer needed for meal plan fetching
} from "firebase/firestore";

// DND Kit Imports
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";

import SelectRecipeModal from "./SelectRecipeModal"; //

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

const RECIPES_COLLECTION_ID = "recipes"; // Using original collection ID
const MEAL_PLANS_COLLECTION_ID = "mealPlans"; // Using original collection ID
const FAMILY_MEAL_PLAN_DOC_ID = "currentFamilyPlan";

const FIXED_DAY_WIDTH_DESKTOP = 230;
// const SCROLL_AMOUNT_DESKTOP = FIXED_DAY_WIDTH_DESKTOP * 2; // Not directly used, but can be if scroll buttons have fixed amounts

// --- Helper: Get Days in Week (no change) ---
const getDaysInWeek = (date) => {
  const days = [];
  const startOfWeek = dayjs(date).startOf("week");
  for (let i = 0; i < 7; i++) {
    days.push(startOfWeek.add(i, "day"));
  }
  return days;
};

// --- Draggable Recipe Item (Desktop only - no change from your structure) ---
function DraggableRecipeItem({ recipe }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `recipe-${recipe.id}`,
      data: { type: "recipe", recipe },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 1000 : "auto",
        cursor: isDragging ? "grabbing" : "grab",
        opacity: isDragging ? 0.8 : 1,
      }
    : { cursor: "grab" };

  const content = (
    <>
      <Text size="sm" fw={500} truncate>
        {recipe.title}
      </Text>
      {recipe.prepTime && (
        <Text size="xs" c="dimmed">
          Prep: {recipe.prepTime}
        </Text>
      )}
    </>
  );

  return (
    <Paper
      ref={setNodeRef}
      p="sm"
      mb="xs"
      shadow={isDragging ? "xl" : "xs"}
      withBorder
      style={style}
      {...listeners}
      {...attributes}
    >
      {content}
    </Paper>
  );
}

// --- Recipe Discovery Panel (Desktop only - no change from your structure) ---
function RecipeDiscoveryPanel({ recipes, isMobile }) {
  const [searchTerm, setSearchTerm] = useState("");
  if (isMobile) return null;

  const filteredRecipes = recipes.filter((recipe) =>
    recipe.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Paper
      shadow="sm"
      p="md"
      withBorder
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <Title order={4} mb="md">
        Discover Recipes
      </Title>
      <TextInput
        placeholder="Search recipes..."
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.currentTarget.value)}
        mb="md"
      />
      <ScrollArea style={{ flexGrow: 1, minHeight: 0 }}>
        {filteredRecipes.length > 0 ? (
          filteredRecipes.map((recipe) => (
            <DraggableRecipeItem key={recipe.id} recipe={recipe} />
          ))
        ) : (
          <Text size="sm" c="dimmed" ta="center" mt="md">
            No recipes found.
          </Text>
        )}
      </ScrollArea>
    </Paper>
  );
}

// --- Day Column (Droppable for Desktop, Clickable area for Mobile) ---
function DayColumn({
  dateString,
  isMobile,
  onDayClick,
  plannedRecipesForDay = [],
  allRecipes = [],
  onDeletePlannedRecipe,
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dateString}`,
    data: { date: dateString, type: "day" },
    disabled: isMobile,
  });

  const dayClickHandler = () => {
    if (isMobile && onDayClick) {
      onDayClick(dateString);
    }
  };

  return (
    <Box
      ref={setNodeRef}
      onClick={dayClickHandler}
      style={{
        border:
          !isMobile && isOver
            ? "2px dashed var(--mantine-color-blue-6)"
            : "1px solid var(--mantine-color-gray-3)",
        backgroundColor:
          !isMobile && isOver
            ? "var(--mantine-color-blue-0)"
            : "var(--mantine-color-body)",
        minHeight: isMobile ? 150 : 380,
        borderRadius: "var(--mantine-radius-md)",
        display: "flex",
        flexDirection: "column",
        padding: "var(--mantine-spacing-xs)",
        cursor: isMobile ? "pointer" : "default",
        transition: "background-color 0.2s ease, border-color 0.2s ease",
      }}
      sx={
        isMobile
          ? (theme) => ({
              "&:hover": { backgroundColor: theme.colors.gray[0] },
            })
          : undefined
      }
    >
      <Group justify="space-between" align="center" mb="sm">
        <Box>
          <Text size="sm" ta="center" fw={500}>
            {dayjs(dateString).format("ddd")}
          </Text>
          <Text size="xs" ta="center" c="dimmed">
            {dayjs(dateString).format("MMM D")}
          </Text>
        </Box>
        {isMobile && (
          <ActionIcon
            variant="light"
            color="blue"
            size="md"
            onClick={dayClickHandler}
            title={`Add recipe to ${dayjs(dateString).format("MMM D")}`}
          >
            <IconPlus size={18} />
          </ActionIcon>
        )}
      </Group>
      <ScrollArea style={{ flexGrow: 1, minHeight: isMobile ? 80 : 0 }}>
        {plannedRecipesForDay.map((meal) => {
          const recipeDetails = allRecipes.find((r) => r.id === meal.recipeId);
          const title = recipeDetails
            ? recipeDetails.title
            : "Recipe not found";
          return (
            <Paper
              key={meal.instanceId}
              p="xs"
              my="xs"
              shadow="xs"
              withBorder
              radius="sm"
              bg="var(--mantine-color-gray-0)"
              style={{ position: "relative" }}
            >
              <Text size="sm" truncate>
                {title}
              </Text>
              <ActionIcon
                color="red"
                variant="subtle"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeletePlannedRecipe(dateString, meal.instanceId);
                }}
                style={{ position: "absolute", top: 2, right: 2 }}
                title="Remove meal"
              >
                <IconTrash size={12} />
              </ActionIcon>
            </Paper>
          );
        })}
        {plannedRecipesForDay.length === 0 && (
          <Text c="dimmed" ta="center" size="xs" p="md">
            {isMobile ? "- Tap + to add recipes -" : "- Drag recipes here -"}
          </Text>
        )}
      </ScrollArea>
    </Box>
  );
}

// --- Weekly Calendar View ---
function WeeklyCalendarView({
  week,
  plannedMeals,
  isMobile,
  onDayClick,
  onDeletePlannedRecipe,
  allRecipes,
}) {
  const daysOfWeek = getDaysInWeek(week);
  const scrollContainerRef = useRef(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(true);

  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        scrollContainerRef.current;
      setShowLeftScroll(scrollLeft > 5);
      setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 5);
    }
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container && !isMobile) {
      container.addEventListener("scroll", handleScroll, { passive: true });
      handleScroll();
      return () => container.removeEventListener("scroll", handleScroll);
    } else if (container) {
      container.removeEventListener("scroll", handleScroll);
      setShowLeftScroll(false);
      setShowRightScroll(false);
    }
  }, [week, isMobile, handleScroll]);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = FIXED_DAY_WIDTH_DESKTOP * 2 * direction;
      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <Paper
      shadow="sm"
      p={isMobile ? "xs" : "md"}
      withBorder
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      <Group justify="space-between" align="center" mb="md">
        <Title order={4}>
          {dayjs(daysOfWeek[0]).format("MMM D")} -{" "}
          {dayjs(daysOfWeek[6]).format("MMM D, YYYY")}
        </Title>
      </Group>

      {!isMobile && showLeftScroll && (
        <ActionIcon
          variant="filled"
          color="gray"
          onClick={() => scroll(-1)}
          style={{
            position: "absolute",
            left: 8,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 20,
          }}
          radius="xl"
          size="lg"
        >
          <IconChevronLeft />
        </ActionIcon>
      )}
      {!isMobile && showRightScroll && (
        <ActionIcon
          variant="filled"
          color="gray"
          onClick={() => scroll(1)}
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 20,
          }}
          radius="xl"
          size="lg"
        >
          <IconChevronRight />
        </ActionIcon>
      )}

      <Box
        ref={scrollContainerRef}
        style={{
          overflowX: isMobile ? "hidden" : "auto",
          overflowY: "hidden",
          flexGrow: 1,
          paddingLeft: !isMobile ? "var(--mantine-spacing-xl)" : undefined,
          paddingRight: !isMobile ? "var(--mantine-spacing-xl)" : undefined,
        }}
      >
        <Box
          style={{
            display: isMobile ? "block" : "flex",
            minWidth: isMobile
              ? "100%"
              : `${daysOfWeek.length * FIXED_DAY_WIDTH_DESKTOP}px`,
          }}
        >
          {daysOfWeek.map((day) => {
            const dateString = day.format("YYYY-MM-DD");
            const recipesForThisDay = plannedMeals[dateString] || [];
            return (
              <Box
                key={dateString}
                style={{
                  minWidth: isMobile ? "100%" : `${FIXED_DAY_WIDTH_DESKTOP}px`,
                  flexShrink: 0,
                  padding: isMobile
                    ? `0 0 var(--mantine-spacing-xs) 0`
                    : `0 var(--mantine-spacing-xs)`,
                  marginBottom: isMobile ? "var(--mantine-spacing-md)" : 0,
                }}
              >
                <DayColumn
                  dateString={dateString}
                  isMobile={isMobile}
                  onDayClick={onDayClick}
                  plannedRecipesForDay={recipesForThisDay}
                  allRecipes={allRecipes}
                  onDeletePlannedRecipe={onDeletePlannedRecipe}
                />
              </Box>
            );
          })}
        </Box>
      </Box>
    </Paper>
  );
}

// --- Main MealPlanner Component ---
export default function MealPlanner() {
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  const [allRecipes, setAllRecipes] = useState([]);
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [plannedMeals, setPlannedMeals] = useState({});
  const [draggedRecipe, setDraggedRecipe] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [
    selectRecipeModalOpened,
    { open: openSelectRecipeModal, close: closeSelectRecipeModal },
  ] = useDisclosure(false);
  const [modalTargetDate, setModalTargetDate] = useState(null);

  // DND Sensors (Simplified)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Fetch All Recipes
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    const q = query(
      collection(db, RECIPES_COLLECTION_ID),
      orderBy("title", "asc")
    );
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const recipesData = [];
        querySnapshot.forEach((doc) => {
          recipesData.push({ ...doc.data(), id: doc.id });
        });
        setAllRecipes(recipesData);
        // Consider setting isLoading to false only after both recipes and plans are loaded
      },
      (err) => {
        console.error("Error fetching recipes: ", err);
        setError("Failed to load recipes. Please try again later.");
        setAllRecipes([]);
      }
    );
    // Set loading to false after initial recipe load attempt or if plan loading is also considered
    // For now, recipes loading manages its part of isLoading.
    // If combined, this setIsLoading(false) would move.
    // setIsLoading(false); // This might be too soon if plan is also loading.
    return () => unsubscribe();
  }, []);

  // Fetch/Subscribe to Meal Plan using onSnapshot
  useEffect(() => {
    setIsLoading(true); // Set loading true when we start fetching plan
    setError(null);
    const planDocRef = doc(
      db,
      MEAL_PLANS_COLLECTION_ID,
      FAMILY_MEAL_PLAN_DOC_ID
    );

    const unsubscribe = onSnapshot(
      planDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setPlannedMeals(docSnap.data().meals || {});
        } else {
          setPlannedMeals({});
          // console.log("Meal plan document does not exist. A new one can be created on save.");
        }
        setIsLoading(false); // Set loading to false after plan is fetched/updated
      },
      (err) => {
        console.error("Error fetching meal plan:", err);
        setError("Failed to load meal plan. Please try again later.");
        setPlannedMeals({});
        setIsLoading(false); // Also set loading to false on error
      }
    );
    return () => unsubscribe();
  }, []); // Runs once on mount

  // Save Plan to Firestore
  const savePlanToFirestore = useCallback(async (newPlanData) => {
    // Consider a more subtle loading indicator for saves if full overlay is too much
    // setIsLoading(true);
    setError(null);
    try {
      const planDocRef = doc(
        db,
        MEAL_PLANS_COLLECTION_ID,
        FAMILY_MEAL_PLAN_DOC_ID
      );
      await setDoc(planDocRef, {
        meals: newPlanData,
        updatedAt: serverTimestamp(),
      });
      // console.log("Meal plan saved successfully!");
    } catch (err) {
      console.error("Error saving meal plan:", err);
      setError(
        "Failed to save meal plan. Please check your connection and try again."
      );
    } finally {
      // setIsLoading(false); // Stop loading after save attempt
    }
  }, []); // db, MEAL_PLANS_COLLECTION_ID, FAMILY_MEAL_PLAN_DOC_ID are constants from outer scope

  // Week Navigation
  const handleNextWeek = () => setCurrentDate((prev) => prev.add(1, "week"));
  const handlePreviousWeek = () =>
    setCurrentDate((prev) => prev.subtract(1, "week"));
  const handleGoToToday = () => setCurrentDate(dayjs());

  // DND Handlers
  function handleDragStart(event) {
    if (isMobile) return;
    const { active } = event;
    if (active.data.current?.type === "recipe") {
      setDraggedRecipe(active.data.current.recipe);
    }
  }

  function handleDragEnd(event) {
    if (isMobile) return;
    const { active, over } = event;
    setDraggedRecipe(null);

    if (
      over &&
      active.data.current?.type === "recipe" &&
      over.data.current?.type === "day"
    ) {
      const recipeBeingDragged = active.data.current.recipe;
      const targetDate = over.data.current.date;

      if (recipeBeingDragged && targetDate) {
        const newPlan = { ...plannedMeals };
        const dayMeals = newPlan[targetDate] || [];
        const newMealInstance = {
          recipeId: recipeBeingDragged.id,
          instanceId: `${recipeBeingDragged.id}-${Date.now()}`,
        };
        newPlan[targetDate] = [...dayMeals, newMealInstance];
        setPlannedMeals(newPlan); // Optimistic update
        savePlanToFirestore(newPlan);
      }
    }
  }

  // Mobile: Open Modal
  const handleOpenModalForDate = (dateString) => {
    setModalTargetDate(dateString);
    openSelectRecipeModal();
  };

  // Mobile: Recipe Selected from Modal
  const handleRecipeSelectFromModal = (selectedRecipe) => {
    if (selectedRecipe && modalTargetDate) {
      const newPlan = { ...plannedMeals };
      const dayMeals = newPlan[modalTargetDate] || [];
      const newMealInstance = {
        recipeId: selectedRecipe.id,
        instanceId: `${selectedRecipe.id}-${Date.now()}`,
      };
      newPlan[modalTargetDate] = [...dayMeals, newMealInstance];
      setPlannedMeals(newPlan); // Optimistic update
      savePlanToFirestore(newPlan);
    }
    closeSelectRecipeModal();
    setModalTargetDate(null);
  };

  // Delete Planned Recipe
  const handleDeletePlannedRecipe = (dateString, mealInstanceId) => {
    const newPlan = { ...plannedMeals };
    const dayMeals = newPlan[dateString] || [];
    const updatedDayMeals = dayMeals.filter(
      (meal) => meal.instanceId !== mealInstanceId
    );

    if (updatedDayMeals.length === 0) {
      delete newPlan[dateString];
    } else {
      newPlan[dateString] = updatedDayMeals;
    }
    setPlannedMeals(newPlan); // Optimistic update
    savePlanToFirestore(newPlan);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Paper
        shadow="none"
        p={0}
        radius="md"
        style={{
          height: "calc(100vh - 80px)", // Adjust based on AppShell header/padding
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        <LoadingOverlay
          visible={isLoading && !error}
          zIndex={1000}
          overlayProps={{ radius: "sm", blur: 2 }}
        />

        <Group
          justify="space-between"
          align="center"
          p="md"
          style={{ borderBottom: `1px solid ${theme.colors.gray[3]}` }}
        >
          <Title order={2}>Meal Planner</Title>
          <Group>
            <Button
              onClick={handleGoToToday}
              variant="light"
              leftSection={<IconCalendarEvent size={16} />}
            >
              Today
            </Button>
            <ActionIcon
              onClick={handlePreviousWeek}
              title="Previous week"
              variant="outline"
              size="lg"
            >
              <IconChevronLeft />
            </ActionIcon>
            <ActionIcon
              onClick={handleNextWeek}
              title="Next week"
              variant="outline"
              size="lg"
            >
              <IconChevronRight />
            </ActionIcon>
          </Group>
        </Group>

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

        <Grid style={{ flexGrow: 1, margin: 0, overflow: "hidden" }} gutter={0}>
          {!isMobile && (
            <Grid.Col
              span={{ md: 3 }}
              style={{
                borderRight: `1px solid ${theme.colors.gray[3]}`,
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box
                style={{
                  flexGrow: 1,
                  overflowY: "auto",
                  padding: theme.spacing.md,
                }}
              >
                <RecipeDiscoveryPanel
                  recipes={allRecipes}
                  isMobile={isMobile}
                />
              </Box>
            </Grid.Col>
          )}
          <Grid.Col
            span={{ base: 12, md: isMobile ? 12 : 9 }}
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box
              style={{
                flexGrow: 1,
                overflowY: "auto",
                padding: isMobile ? theme.spacing.xs : theme.spacing.md,
              }}
            >
              <WeeklyCalendarView
                week={currentDate.toDate()}
                plannedMeals={plannedMeals}
                isMobile={isMobile}
                onDayClick={handleOpenModalForDate}
                onDeletePlannedRecipe={handleDeletePlannedRecipe}
                allRecipes={allRecipes}
              />
            </Box>
          </Grid.Col>
        </Grid>

        {!isMobile && draggedRecipe && (
          <DragOverlay dropAnimation={null}>
            <Paper
              p="sm"
              shadow="xl"
              withBorder
              radius="md"
              style={{ backgroundColor: theme.white }}
            >
              <Text size="sm" fw={500} truncate>
                {draggedRecipe.title}
              </Text>
              {draggedRecipe.prepTime && (
                <Text size="xs" c="dimmed">
                  Prep: {draggedRecipe.prepTime}
                </Text>
              )}
            </Paper>
          </DragOverlay>
        )}

        <SelectRecipeModal
          opened={selectRecipeModalOpened}
          onClose={closeSelectRecipeModal}
          recipes={allRecipes}
          onSelectRecipe={handleRecipeSelectFromModal}
          targetDate={modalTargetDate}
        />
      </Paper>
    </DndContext>
  );
}
