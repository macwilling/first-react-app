// src/components/MealPlanner.jsx
import { useState, useEffect, useRef } from "react";
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
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  IconChevronLeft,
  IconChevronRight,
  IconCalendarEvent,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react"; // Added IconTrash
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import isoWeek from "dayjs/plugin/isoWeek";
import { db } from "../firebase";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  // For sortable (if we add reordering planned meals later)
  // SortableContext,
  // useSortable,
  // arrayMove,
  // verticalListSortingStrategy,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import SelectRecipeModal from "./SelectRecipeModal";

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

const RECIPES_COLLECTION = "recipes";
const FIXED_DAY_WIDTH_DESKTOP = 230; // Increased slightly
const SCROLL_AMOUNT_DESKTOP = FIXED_DAY_WIDTH_DESKTOP * 2;

const getDaysInWeek = (date) => {
  const days = [];
  const startOfWeek = dayjs(date).startOf("week");
  for (let i = 0; i < 7; i++) {
    days.push(startOfWeek.add(i, "day"));
  }
  return days;
};

// --- Draggable Recipe Item (Desktop only - no change from previous version) ---
function DraggableRecipeItem({ recipe }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `recipe-${recipe.id}`,
      data: { type: "recipe", recipe },
    });
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 100 : "auto",
        cursor: isDragging ? "grabbing" : "grab",
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
  if (isDragging) {
    return (
      <Paper
        ref={setNodeRef}
        p="sm"
        mb="xs"
        shadow="xs"
        withBorder
        style={{ ...style, opacity: 0.5 }}
        {...listeners}
        {...attributes}
      >
        {content}
      </Paper>
    );
  }
  return (
    <Paper
      ref={setNodeRef}
      p="sm"
      mb="xs"
      shadow="xs"
      withBorder
      style={style}
      {...listeners}
      {...attributes}
    >
      {content}
    </Paper>
  );
}

// --- Recipe Discovery Panel (Desktop only - no change) ---
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
        placeholder="Search recipes by title..."
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
          <Text size="sm" c="dimmed">
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
  children,
  isMobile,
  onDayClick,
  plannedRecipesForDay = [],
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dateString}`, // ID is now just the date
    data: { date: dateString, type: "day" }, // type: 'day' to differentiate from recipes if needed
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
      onClick={dayClickHandler} // Click whole day area on mobile
      style={{
        border:
          !isMobile && isOver
            ? "2px dashed var(--mantine-color-blue-6)"
            : "1px solid var(--mantine-color-gray-2)", // Solid border for days
        backgroundColor:
          !isMobile && isOver ? "var(--mantine-color-blue-0)" : "transparent",
        minHeight: isMobile ? 150 : 380, // Shorter minHeight for mobile if needed, or 'auto'
        borderRadius: "var(--mantine-radius-md)", // Rounded days
        display: "flex",
        flexDirection: "column",
        padding: "var(--mantine-spacing-xs)",
        cursor: isMobile ? "pointer" : "default",
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
        {" "}
        {/* Scroll if many recipes in a day */}
        {children}
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
}) {
  const daysOfWeek = getDaysInWeek(week);
  const scrollContainerRef = useRef(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(true);

  const handleScroll = () => {
    /* ... (same as before) ... */ if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        scrollContainerRef.current;
      setShowLeftScroll(scrollLeft > 5);
      setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };
  useEffect(() => {
    /* ... (same as before, respecting isMobile) ... */ const container =
      scrollContainerRef.current;
    if (container && !isMobile) {
      container.addEventListener("scroll", handleScroll, { passive: true });
      handleScroll();
      return () => container.removeEventListener("scroll", handleScroll);
    } else if (container) {
      container.removeEventListener("scroll", handleScroll);
      setShowLeftScroll(false);
      setShowRightScroll(false);
    }
  }, [week, isMobile]);
  const scrollLeft = () => {
    /* ... (same) ... */
  };
  const scrollRight = () => {
    /* ... (same) ... */
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
          onClick={scrollLeft}
          style={{
            position: "absolute",
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 20,
            boxShadow: "var(--mantine-shadow-md)",
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
          onClick={scrollRight}
          style={{
            position: "absolute",
            right: 0,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 20,
            boxShadow: "var(--mantine-shadow-md)",
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
          overflowY: isMobile ? "auto" : "hidden",
          flexGrow: 1,
          paddingLeft: !isMobile ? "var(--mantine-spacing-md)" : undefined,
          paddingRight: !isMobile ? "var(--mantine-spacing-md)" : undefined,
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
                  flexShrink: isMobile ? 1 : 0,
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
                >
                  {recipesForThisDay.map((meal) => (
                    <Paper
                      key={meal.id}
                      p="xs"
                      my="xs"
                      shadow="xs"
                      withBorder
                      radius="sm"
                      bg="var(--mantine-color-gray-0)"
                      style={{ position: "relative" }}
                    >
                      <Text size="sm" truncate>
                        {meal.recipeTitle || meal.description}
                      </Text>
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        size="xs"
                        onClick={() =>
                          onDeletePlannedRecipe(dateString, meal.id)
                        }
                        style={{ position: "absolute", top: 2, right: 2 }}
                        title="Remove meal"
                      >
                        <IconTrash size={12} />
                      </ActionIcon>
                    </Paper>
                  ))}
                  {recipesForThisDay.length === 0 &&
                    !isMobile && ( // Placeholder text for empty desktop days
                      <Text c="dimmed" ta="center" size="xs" p="md">
                        - Drag recipes here -
                      </Text>
                    )}
                  {recipesForThisDay.length === 0 && isMobile && (
                    <Text c="dimmed" ta="center" size="xs" p="md">
                      - Tap + to add recipes -
                    </Text>
                  )}
                </DayColumn>
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
  const [allRecipes, setAllRecipes] = useState([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [currentDate, setCurrentDate] = useState(dayjs());
  // New plannedMeals structure: { 'YYYY-MM-DD': [ {recipeId, recipeTitle, id (instanceId)}, ... ] }
  const [plannedMeals, setPlannedMeals] = useState({});
  const [draggedRecipe, setDraggedRecipe] = useState(null);

  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  const [
    selectRecipeModalOpened,
    { open: openSelectRecipeModal, close: closeSelectRecipeModal },
  ] = useDisclosure(false);
  const [modalTargetDate, setModalTargetDate] = useState(null); // Changed from modalTargetSlot

  const sensors = useSensors(/* ... (same) ... */);
  useEffect(() => {
    /* ... (recipe fetching - same) ... */
  }, []);
  const handleNextWeek = () => setCurrentDate(currentDate.add(1, "week"));
  const handlePreviousWeek = () =>
    setCurrentDate(currentDate.subtract(1, "week"));
  const handleGoToToday = () => setCurrentDate(dayjs());

  function handleDragStart(event) {
    /* ... (same, respects isMobile) ... */
  }

  function handleDragEnd(event) {
    if (isMobile) return;
    const { active, over } = event;
    setDraggedRecipe(null);

    // Check if dropped on a day column
    if (
      over &&
      active.data.current?.type === "recipe" &&
      over.data.current?.type === "day"
    ) {
      const recipe = active.data.current.recipe;
      const targetDate = over.data.current.date; // Dropping directly on a day

      if (recipe && targetDate) {
        setPlannedMeals((prev) => {
          const dayMeals = prev[targetDate] || [];
          const newMeal = {
            recipeId: recipe.id,
            recipeTitle: recipe.title,
            prepTime: recipe.prepTime,
            id: `${recipe.id}-${Date.now()}`,
          };
          return { ...prev, [targetDate]: [...dayMeals, newMeal] };
        });
      }
    }
  }

  const handleOpenModalForDate = (dateString) => {
    // Renamed from handleOpenModalForSlot
    setModalTargetDate(dateString);
    openSelectRecipeModal();
  };

  const handleRecipeSelectFromModal = (recipe) => {
    if (recipe && modalTargetDate) {
      setPlannedMeals((prev) => {
        const dayMeals = prev[modalTargetDate] || [];
        const newMeal = {
          recipeId: recipe.id,
          recipeTitle: recipe.title,
          prepTime: recipe.prepTime,
          id: `${recipe.id}-${Date.now()}`,
        };
        return { ...prev, [modalTargetDate]: [...dayMeals, newMeal] };
      });
    }
    closeSelectRecipeModal();
    setModalTargetDate(null); // Reset target date
  };

  const handleDeletePlannedRecipe = (dateString, mealInstanceId) => {
    setPlannedMeals((prev) => {
      const dayMeals = prev[dateString] || [];
      const updatedDayMeals = dayMeals.filter(
        (meal) => meal.id !== mealInstanceId
      );
      if (updatedDayMeals.length === 0) {
        const newPlan = { ...prev };
        delete newPlan[dateString];
        return newPlan;
      }
      return {
        ...prev,
        [dateString]: updatedDayMeals,
      };
    });
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
        style={{ height: "100%", display: "flex", flexDirection: "column" }}
      >
        <Group
          justify="space-between"
          mb="md"
          p="md"
          style={{ borderBottom: "1px solid var(--mantine-color-gray-3)" }}
        >
          <Title order={2}>Meal Planner</Title>
          <Group> {/* ... Week Nav Icons ... */} </Group>
        </Group>

        <Grid style={{ flexGrow: 1, margin: 0 }} gutter={0}>
          {!isMobile && (
            <Grid.Col
              span={{ md: 3 }}
              p="md"
              style={{
                borderRight: "1px solid var(--mantine-color-gray-3)",
                height: "100%",
                overflowY: "auto",
              }}
            >
              <RecipeDiscoveryPanel recipes={allRecipes} isMobile={isMobile} />
            </Grid.Col>
          )}
          <Grid.Col
            span={{ base: 12, md: isMobile ? 12 : 9 }}
            p="xs"
            /* Reduced padding for this col slightly */ style={{
              height: "100%",
              overflowY: isMobile ? "auto" : "hidden",
            }}
          >
            <WeeklyCalendarView
              week={currentDate.toDate()}
              plannedMeals={plannedMeals}
              isMobile={isMobile}
              onDayClick={handleOpenModalForDate} // Renamed prop
              onDeletePlannedRecipe={handleDeletePlannedRecipe} // Pass delete handler
            />
          </Grid.Col>
        </Grid>

        {!isMobile && draggedRecipe && (
          <DragOverlay dropAnimation={null}>{/* ... */}</DragOverlay>
        )}

        <SelectRecipeModal
          opened={selectRecipeModalOpened}
          onClose={closeSelectRecipeModal}
          recipes={allRecipes}
          onSelectRecipe={handleRecipeSelectFromModal}
          targetDate={modalTargetDate} // Renamed prop
        />
      </Paper>
    </DndContext>
  );
}
