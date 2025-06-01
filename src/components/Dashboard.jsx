// src/components/Dashboard.jsx
import React, { useState, useEffect } from "react";
import {
  Grid,
  List,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Badge,
  Group,
  Divider,
  Box,
  LoadingOverlay,
  Alert,
} from "@mantine/core";
import {
  IconCheck,
  IconClockHour4,
  IconListCheck,
  IconTool,
  IconShoppingCart,
  IconToolsKitchen2,
  IconNote,
  IconCircleDashed,
  IconAlertCircle,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { db } from "../firebase"; // Your Firebase config
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  limit,
} from "firebase/firestore";

dayjs.extend(isSameOrBefore);

const RECENT_DAYS = 7;
const UPCOMING_DAYS = 7;
const ITEM_LIMIT = 5; // Max items to show per section

// Collection names (ensure these match your Firestore collections)
const CHORES_COLLECTION = "chores";
const MAINTENANCE_TASKS_COLLECTION = "maintenanceTasks";
const SHOPPING_LISTS_COLLECTION = "shoppingLists";
const MEAL_PLANS_COLLECTION = "mealPlans"; // Assuming 'mealPlans' for the collection
const FAMILY_MEAL_PLAN_DOC_ID = "currentFamilyPlan"; // And 'currentFamilyPlan' for the document
const NOTES_COLLECTION = "notes";
const RECIPES_COLLECTION = "recipes";

export default function Dashboard() {
  const [recentChores, setRecentChores] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [shoppingSummary, setShoppingSummary] = useState({
    name: "Shopping List",
    items: [],
    totalPending: 0,
  });
  const [mealPlanToday, setMealPlanToday] = useState([]);
  const [mealPlanTomorrow, setMealPlanTomorrow] = useState([]);
  const [recentNotesList, setRecentNotesList] = useState([]);
  const [allRecipes, setAllRecipes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Combined loading effect
  useEffect(() => {
    const choresUnsub = onSnapshot(
      query(
        collection(db, CHORES_COLLECTION),
        orderBy("completedAt", "desc"),
        limit(ITEM_LIMIT * 2)
      ),
      (snapshot) => {
        const choresData = snapshot.docs
          .map((doc) => ({ ...doc.data(), id: doc.id }))
          .filter(
            (chore) =>
              chore.done &&
              chore.completedAt &&
              dayjs(chore.completedAt.toDate()).isAfter(
                dayjs().subtract(RECENT_DAYS, "day")
              )
          )
          .slice(0, ITEM_LIMIT);
        setRecentChores(choresData);
      },
      (err) => {
        console.error("Chores error: ", err);
        setError((prev) => prev + " Chores fetch failed.");
      }
    );

    const tasksUnsub = onSnapshot(
      query(
        collection(db, MAINTENANCE_TASKS_COLLECTION),
        orderBy("dueDate", "asc"),
        limit(ITEM_LIMIT * 2)
      ),
      (snapshot) => {
        const tasksData = snapshot.docs
          .map((doc) => ({ ...doc.data(), id: doc.id }))
          .filter(
            (task) =>
              task.dueDate &&
              dayjs(task.dueDate.toDate()).isAfter(dayjs().subtract(1, "day"))
          )
          .slice(0, ITEM_LIMIT);
        setUpcomingTasks(tasksData);
      },
      (err) => {
        console.error("Tasks error: ", err);
        setError((prev) => prev + " Tasks fetch failed.");
      }
    );

    const shoppingUnsub = onSnapshot(
      query(
        collection(db, SHOPPING_LISTS_COLLECTION),
        orderBy("createdAt", "asc"),
        limit(1)
      ), // Assuming first list is primary
      (snapshot) => {
        if (!snapshot.empty) {
          const primaryList = {
            ...snapshot.docs[0].data(),
            id: snapshot.docs[0].id,
          };
          const pendingItems = (primaryList.items || []).filter(
            (item) => !item.done
          );
          setShoppingSummary({
            name: primaryList.name || "Shopping List",
            items: pendingItems.slice(0, ITEM_LIMIT),
            totalPending: pendingItems.length,
          });
        } else {
          setShoppingSummary({
            name: "Shopping List",
            items: [],
            totalPending: 0,
          });
        }
      },
      (err) => {
        console.error("Shopping error: ", err);
        setError((prev) => prev + " Shopping List fetch failed.");
      }
    );

    const recipesUnsub = onSnapshot(
      query(collection(db, RECIPES_COLLECTION), orderBy("title", "asc")),
      (snapshot) => {
        setAllRecipes(
          snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }))
        );
      },
      (err) => {
        console.error("Recipes error: ", err);
        setError((prev) => prev + " Recipes fetch failed.");
      }
    );

    const mealPlanUnsub = onSnapshot(
      doc(db, MEAL_PLANS_COLLECTION, FAMILY_MEAL_PLAN_DOC_ID),
      (docSnap) => {
        if (docSnap.exists()) {
          const plan = docSnap.data().meals || {};
          const todayStr = dayjs().format("YYYY-MM-DD");
          const tomorrowStr = dayjs().add(1, "day").format("YYYY-MM-DD");
          setMealPlanToday(plan[todayStr] || []);
          setMealPlanTomorrow(plan[tomorrowStr] || []);
        } else {
          setMealPlanToday([]);
          setMealPlanTomorrow([]);
        }
      },
      (err) => {
        console.error("Meal plan error: ", err);
        setError((prev) => prev + " Meal Plan fetch failed.");
      }
    );

    const notesUnsub = onSnapshot(
      query(
        collection(db, NOTES_COLLECTION),
        orderBy("createdAt", "desc"),
        limit(ITEM_LIMIT)
      ),
      (snapshot) => {
        setRecentNotesList(
          snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }))
        );
      },
      (err) => {
        console.error("Notes error: ", err);
        setError((prev) => prev + " Notes fetch failed.");
      }
    );

    // Determine overall loading state
    // This is a simplified version; for more precise loading, track each subscription.
    Promise.all([
      new Promise((res) => (choresUnsub ? res() : null)), // These won't really "resolve" in a traditional sense here
      new Promise((res) => (tasksUnsub ? res() : null)),
      new Promise((res) => (shoppingUnsub ? res() : null)),
      new Promise((res) => (mealPlanUnsub ? res() : null)),
      new Promise((res) => (notesUnsub ? res() : null)),
      new Promise((res) => (recipesUnsub ? res() : null)),
    ]).finally(() => setLoading(false));

    return () => {
      choresUnsub();
      tasksUnsub();
      shoppingUnsub();
      mealPlanUnsub();
      notesUnsub();
      recipesUnsub();
    };
  }, []);

  const getDueDateBadge = (firestoreTimestamp) => {
    if (!firestoreTimestamp || !firestoreTimestamp.toDate)
      return <Badge color="gray">No Date</Badge>;
    const date = dayjs(firestoreTimestamp.toDate());
    const today = dayjs().startOf("day");
    if (date.isBefore(today))
      return (
        <Badge color="red" variant="light">
          Overdue
        </Badge>
      );
    if (date.isSame(today))
      return (
        <Badge color="orange" variant="light">
          Due Today
        </Badge>
      );
    if (date.isBefore(today.add(UPCOMING_DAYS, "day")))
      return (
        <Badge color="yellow" variant="light">
          Upcoming
        </Badge>
      );
    return (
      <Badge color="blue" variant="light">
        Later
      </Badge>
    );
  };

  const getRecipeTitleById = (recipeId) => {
    const recipe = allRecipes.find((r) => r.id === recipeId);
    return recipe ? recipe.title : "Recipe not found";
  };

  return (
    <Box style={{ position: "relative" }}>
      <LoadingOverlay
        visible={loading}
        overlayProps={{ radius: "sm", blur: 2 }}
      />
      {error && (
        <Alert
          icon={<IconAlertCircle size="1rem" />}
          title="Dashboard Error"
          color="red"
          withCloseButton
          onClose={() => setError(null)}
          m="md"
        >
          {`Could not load some dashboard data: ${error}`}
        </Alert>
      )}
      <Grid>
        {/* Recently Completed Chores */}
        <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
          <Paper shadow="md" p="lg" radius="md" withBorder h="100%">
            <Group mb="md">
              <ThemeIcon size="lg" variant="light" color="teal">
                <IconListCheck size={24} />
              </ThemeIcon>
              <Title order={3}>Recent Chores</Title>
            </Group>
            {recentChores.length > 0 ? (
              <List spacing="sm" size="sm">
                {recentChores.map((chore) => (
                  <List.Item
                    key={chore.id}
                    icon={
                      <ThemeIcon color="teal" size={24} radius="xl">
                        <IconCheck size={16} />
                      </ThemeIcon>
                    }
                  >
                    <Group justify="space-between">
                      <Text>
                        {chore.title} ({chore.assignedTo})
                      </Text>
                      <Text c="dimmed" size="xs">
                        {chore.completedAt?.toDate
                          ? dayjs(chore.completedAt.toDate()).format("MMM D")
                          : ""}
                      </Text>
                    </Group>
                  </List.Item>
                ))}
              </List>
            ) : !loading ? (
              <Text c="dimmed">No chores completed recently.</Text>
            ) : null}
          </Paper>
        </Grid.Col>

        {/* Upcoming Maintenance */}
        <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
          <Paper shadow="md" p="lg" radius="md" withBorder h="100%">
            <Group mb="md">
              <ThemeIcon size="lg" variant="light" color="cyan">
                <IconTool size={24} />
              </ThemeIcon>
              <Title order={3}>Upcoming Maintenance</Title>
            </Group>
            {upcomingTasks.length > 0 ? (
              <List spacing="sm" size="sm">
                {upcomingTasks.map((task) => (
                  <List.Item
                    key={task.id}
                    icon={
                      <ThemeIcon color="cyan" size={24} radius="xl">
                        <IconClockHour4 size={16} />
                      </ThemeIcon>
                    }
                  >
                    <Group justify="space-between">
                      <Text>{task.title}</Text>
                      <Group gap="xs">
                        {getDueDateBadge(task.dueDate)}
                        {task.dueDate?.toDate && (
                          <Text c="dimmed" size="xs">
                            {dayjs(task.dueDate.toDate()).format("MMM D")}
                          </Text>
                        )}
                      </Group>
                    </Group>
                  </List.Item>
                ))}
              </List>
            ) : !loading ? (
              <Text c="dimmed">No upcoming maintenance tasks.</Text>
            ) : null}
          </Paper>
        </Grid.Col>

        {/* Shopping List Quick View */}
        <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
          <Paper shadow="md" p="lg" radius="md" withBorder h="100%">
            <Group mb="md">
              <ThemeIcon size="lg" variant="light" color="orange">
                <IconShoppingCart size={24} />
              </ThemeIcon>
              <Title order={3}>{shoppingSummary.name}</Title>
            </Group>
            {shoppingSummary.items.length > 0 ? (
              <List spacing="xs" size="sm">
                {shoppingSummary.items.map((item) => (
                  <List.Item
                    key={item.id}
                    icon={
                      <IconCircleDashed size={14} style={{ marginTop: 4 }} />
                    }
                  >
                    <Text>
                      {item.text} {item.quantity && `(${item.quantity})`}
                    </Text>
                  </List.Item>
                ))}
                {shoppingSummary.totalPending >
                  shoppingSummary.items.length && (
                  <Text size="xs" c="dimmed" mt="xs">
                    +{" "}
                    {shoppingSummary.totalPending -
                      shoppingSummary.items.length}{" "}
                    more items...
                  </Text>
                )}
              </List>
            ) : shoppingSummary.totalPending === 0 && !loading ? (
              <Text c="dimmed">
                All items bought from {shoppingSummary.name}!
              </Text>
            ) : !loading ? (
              <Text c="dimmed">No pending items or lists.</Text>
            ) : null}
          </Paper>
        </Grid.Col>

        {/* Meal Plan Quick View */}
        <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
          <Paper shadow="md" p="lg" radius="md" withBorder h="100%">
            <Group mb="md">
              <ThemeIcon size="lg" variant="light" color="lime">
                <IconToolsKitchen2 size={24} />
              </ThemeIcon>
              <Title order={3}>Meals for Today</Title>
            </Group>
            {mealPlanToday.length > 0 ? (
              <List spacing="xs" size="sm">
                {mealPlanToday.map((meal) => (
                  <List.Item key={meal.instanceId}>
                    <Text>{getRecipeTitleById(meal.recipeId)}</Text>
                  </List.Item>
                ))}
              </List>
            ) : !loading ? (
              <Text c="dimmed">No meals planned for today.</Text>
            ) : null}

            {mealPlanTomorrow.length > 0 && (
              <>
                <Divider my="sm" label="Tomorrow" labelPosition="center" />
                <List spacing="xs" size="sm">
                  {mealPlanTomorrow.map((meal) => (
                    <List.Item key={meal.instanceId}>
                      <Text>{getRecipeTitleById(meal.recipeId)}</Text>
                    </List.Item>
                  ))}
                </List>
              </>
            )}
          </Paper>
        </Grid.Col>

        {/* Notes Quick View */}
        <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
          <Paper shadow="md" p="lg" radius="md" withBorder h="100%">
            <Group mb="md">
              <ThemeIcon size="lg" variant="light" color="yellow">
                <IconNote size={24} />
              </ThemeIcon>
              <Title order={3}>Recent Notes</Title>
            </Group>
            {recentNotesList.length > 0 ? (
              <Stack gap="xs">
                {recentNotesList.map((note) => (
                  <Paper
                    key={note.id}
                    p="xs"
                    radius="sm"
                    withBorder
                    style={{ backgroundColor: note.color }}
                  >
                    <Text fw={500} truncate>
                      {note.title || "Untitled Note"}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {note.content.split("\n")[0]}
                    </Text>
                  </Paper>
                ))}
              </Stack>
            ) : !loading ? (
              <Text c="dimmed">No notes yet.</Text>
            ) : null}
          </Paper>
        </Grid.Col>
        {/* Placeholder for alignment if needed, or add another widget */}
        {/* <Grid.Col span={{ base: 12, md: 6, lg: 4 }} />  */}
      </Grid>
    </Box>
  );
}
