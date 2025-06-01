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
import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  limit,
  doc,
} from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext"; // Corrected Import Path

dayjs.extend(isSameOrBefore);

const RECENT_DAYS = 7;
const UPCOMING_DAYS = 7;
const ITEM_LIMIT = 5;

const FAMILY_MEAL_PLAN_DOC_ID = "currentFamilyPlan";

export default function Dashboard() {
  const { familyId } = useAuth();

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

  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      setRecentChores([]);
      setUpcomingTasks([]);
      setShoppingSummary({ name: "Shopping List", items: [], totalPending: 0 });
      setMealPlanToday([]);
      setMealPlanTomorrow([]);
      setRecentNotesList([]);
      setAllRecipes([]);
      return;
    }

    setLoading(true);
    setError(null);
    let active = true;
    let errorMessages = [];
    const basePath = `families/${familyId}`;

    const unsubscribers = [
      onSnapshot(
        query(
          collection(db, `${basePath}/chores`),
          orderBy("completedAt", "desc"),
          limit(ITEM_LIMIT * 2)
        ),
        (snapshot) => {
          if (!active) return;
          const choresData = snapshot.docs
            .map((d) => ({ ...d.data(), id: d.id }))
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
          if (active) {
            console.error("Chores error: ", err);
            errorMessages.push("Chores");
            setError(errorMessages.join(", "));
          }
        }
      ),
      onSnapshot(
        query(
          collection(db, `${basePath}/maintenanceTasks`),
          orderBy("dueDate", "asc"),
          limit(ITEM_LIMIT * 2)
        ),
        (snapshot) => {
          if (!active) return;
          const tasksData = snapshot.docs
            .map((d) => ({ ...d.data(), id: d.id }))
            .filter(
              (task) =>
                task.dueDate &&
                dayjs(task.dueDate.toDate()).isAfter(dayjs().subtract(1, "day"))
            )
            .slice(0, ITEM_LIMIT);
          setUpcomingTasks(tasksData);
        },
        (err) => {
          if (active) {
            console.error("Tasks error: ", err);
            errorMessages.push("Maintenance");
            setError(errorMessages.join(", "));
          }
        }
      ),
      onSnapshot(
        query(
          collection(db, `${basePath}/shoppingLists`),
          orderBy("createdAt", "asc"),
          limit(1)
        ),
        (snapshot) => {
          if (!active) return;
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
          if (active) {
            console.error("Shopping error: ", err);
            errorMessages.push("Shopping Lists");
            setError(errorMessages.join(", "));
          }
        }
      ),
      onSnapshot(
        query(collection(db, `${basePath}/recipes`), orderBy("title", "asc")),
        (snapshot) => {
          if (!active) return;
          setAllRecipes(snapshot.docs.map((d) => ({ ...d.data(), id: d.id })));
        },
        (err) => {
          if (active) {
            console.error("Recipes error: ", err);
            errorMessages.push("Recipes");
            setError(errorMessages.join(", "));
          }
        }
      ),
      onSnapshot(
        doc(db, `${basePath}/mealPlans`, FAMILY_MEAL_PLAN_DOC_ID),
        (docSnap) => {
          if (!active) return;
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
          if (active) {
            console.error("Meal plan error: ", err);
            errorMessages.push("Meal Plan");
            setError(errorMessages.join(", "));
          }
        }
      ),
      onSnapshot(
        query(
          collection(db, `${basePath}/notes`),
          orderBy("createdAt", "desc"),
          limit(ITEM_LIMIT)
        ),
        (snapshot) => {
          if (!active) return;
          setRecentNotesList(
            snapshot.docs.map((d) => ({ ...d.data(), id: d.id }))
          );
        },
        (err) => {
          if (active) {
            console.error("Notes error: ", err);
            errorMessages.push("Notes");
            setError(errorMessages.join(", "));
          }
        }
      ),
    ];

    const timer = setTimeout(() => {
      if (active) setLoading(false);
    }, 2000);

    return () => {
      active = false;
      clearTimeout(timer);
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [familyId]);

  const getDueDateBadge = (firestoreTimestamp) => {
    /* ... same ... */
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
    /* ... same ... */
    const recipe = allRecipes.find((r) => r.id === recipeId);
    return recipe ? recipe.title : "Recipe name loading...";
  };

  if (!familyId && !loading) {
    return (
      <Paper p="lg" withBorder>
        <Text>Please create or join a family to view the dashboard.</Text>
      </Paper>
    );
  }

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
          {" "}
          {`Could not load some dashboard data. Failed sections: ${error}`}{" "}
        </Alert>
      )}
      <Grid>
        <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
          <Paper shadow="md" p="lg" radius="md" withBorder h="100%">
            {" "}
            <Group mb="md">
              {" "}
              <ThemeIcon size="lg" variant="light" color="teal">
                {" "}
                <IconListCheck size={24} />{" "}
              </ThemeIcon>{" "}
              <Title order={3}>Recent Chores</Title>{" "}
            </Group>{" "}
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
            ) : !loading && (!error || !error.includes("Chores")) ? (
              <Text c="dimmed">No chores completed recently.</Text>
            ) : null}{" "}
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
          <Paper shadow="md" p="lg" radius="md" withBorder h="100%">
            {" "}
            <Group mb="md">
              {" "}
              <ThemeIcon size="lg" variant="light" color="cyan">
                {" "}
                <IconTool size={24} />{" "}
              </ThemeIcon>{" "}
              <Title order={3}>Upcoming Maintenance</Title>{" "}
            </Group>{" "}
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
            ) : !loading && (!error || !error.includes("Maintenance")) ? (
              <Text c="dimmed">No upcoming maintenance tasks.</Text>
            ) : null}{" "}
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
          <Paper shadow="md" p="lg" radius="md" withBorder h="100%">
            {" "}
            <Group mb="md">
              {" "}
              <ThemeIcon size="lg" variant="light" color="orange">
                {" "}
                <IconShoppingCart size={24} />{" "}
              </ThemeIcon>{" "}
              <Title order={3}>{shoppingSummary.name}</Title>{" "}
            </Group>{" "}
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
            ) : shoppingSummary.totalPending === 0 &&
              !loading &&
              (!error || !error.includes("Shopping")) ? (
              <Text c="dimmed">
                All items bought from {shoppingSummary.name}!
              </Text>
            ) : !loading && (!error || !error.includes("Shopping")) ? (
              <Text c="dimmed">No pending items or lists.</Text>
            ) : null}{" "}
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
          <Paper shadow="md" p="lg" radius="md" withBorder h="100%">
            {" "}
            <Group mb="md">
              {" "}
              <ThemeIcon size="lg" variant="light" color="lime">
                {" "}
                <IconToolsKitchen2 size={24} />{" "}
              </ThemeIcon>{" "}
              <Title order={3}>Meals for Today</Title>{" "}
            </Group>{" "}
            {mealPlanToday.length > 0 ? (
              <List spacing="xs" size="sm">
                {mealPlanToday.map((meal) => (
                  <List.Item key={meal.instanceId}>
                    <Text>{getRecipeTitleById(meal.recipeId)}</Text>
                  </List.Item>
                ))}
              </List>
            ) : !loading && (!error || !error.includes("Meal Plan")) ? (
              <Text c="dimmed">No meals planned for today.</Text>
            ) : null}{" "}
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
            )}{" "}
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
          <Paper shadow="md" p="lg" radius="md" withBorder h="100%">
            {" "}
            <Group mb="md">
              {" "}
              <ThemeIcon size="lg" variant="light" color="yellow">
                {" "}
                <IconNote size={24} />{" "}
              </ThemeIcon>{" "}
              <Title order={3}>Recent Notes</Title>{" "}
            </Group>{" "}
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
            ) : !loading && (!error || !error.includes("Notes")) ? (
              <Text c="dimmed">No notes yet.</Text>
            ) : null}{" "}
          </Paper>
        </Grid.Col>
      </Grid>
    </Box>
  );
}
