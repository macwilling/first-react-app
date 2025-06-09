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
  SimpleGrid, // Added for stat cards layout
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
  IconExclamationCircle, // For overdue tasks
  IconCalendarEvent, // For upcoming tasks
} from "@tabler/icons-react";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween"; // For date range checks
import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  limit,
  doc,
  getCountFromServer, // To get total counts efficiently if needed later
} from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";

dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);

const RECENT_DAYS = 7;
const UPCOMING_DAYS = 7;
const ITEM_LIMIT = 5; // For detailed lists

const FAMILY_MEAL_PLAN_DOC_ID = "currentFamilyPlan";

// Stat Card Component (Optional, or inline JSX)
function StatCard({ title, value, icon, color, description }) {
  return (
    <Paper withBorder p="md" radius="md" h="100%">
      <Group justify="space-between">
        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
          {title}
        </Text>
        {/* Optional: Add a small icon or badge here if needed */}
      </Group>
      <Group align="flex-end" gap="xs" mt="xs">
        <Text fz={38} fw={700} lh={1.1}>
          {" "}
          {/* Increased font size */}
          {value}
        </Text>
        <ThemeIcon color={color} variant="light" size={38} radius="md">
          {" "}
          {/* Increased icon size */}
          {icon}
        </ThemeIcon>
      </Group>
      {description && (
        <Text fz="xs" c="dimmed" mt="sm">
          {description}
        </Text>
      )}
    </Paper>
  );
}

export default function Dashboard() {
  const { familyId } = useAuth();

  // States for detailed lists (existing)
  const [recentChoresList, setRecentChoresList] = useState([]);
  const [upcomingTasksList, setUpcomingTasksList] = useState([]);
  const [shoppingSummaryList, setShoppingSummaryList] = useState({
    name: "Shopping List",
    items: [],
  });
  const [mealPlanTodayList, setMealPlanTodayList] = useState([]);
  const [mealPlanTomorrowList, setMealPlanTomorrowList] = useState([]);
  const [recentNotesDetailedList, setRecentNotesDetailedList] = useState([]);
  const [allRecipes, setAllRecipes] = useState([]); // Keep for meal plan recipe name resolution

  // States for Stats
  const [choresCompletedLast7DaysCount, setChoresCompletedLast7DaysCount] =
    useState(0);
  const [overdueMaintenanceTasksCount, setOverdueMaintenanceTasksCount] =
    useState(0);
  const [
    dueThisWeekMaintenanceTasksCount,
    setDueThisWeekMaintenanceTasksCount,
  ] = useState(0);
  const [totalPendingShoppingItems, setTotalPendingShoppingItems] = useState(0);
  const [mealsTodayCount, setMealsTodayCount] = useState(0);
  const [mealsTomorrowCount, setMealsTomorrowCount] = useState(0);
  const [notesCreatedLast7DaysCount, setNotesCreatedLast7DaysCount] =
    useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      // Reset all states
      setRecentChoresList([]);
      setUpcomingTasksList([]);
      setShoppingSummaryList({ name: "Shopping List", items: [] });
      setMealPlanTodayList([]);
      setMealPlanTomorrowList([]);
      setRecentNotesDetailedList([]);
      setAllRecipes([]);
      setChoresCompletedLast7DaysCount(0);
      setOverdueMaintenanceTasksCount(0);
      setDueThisWeekMaintenanceTasksCount(0);
      setTotalPendingShoppingItems(0);
      setMealsTodayCount(0);
      setMealsTomorrowCount(0);
      setNotesCreatedLast7DaysCount(0);
      return;
    }

    setLoading(true);
    setError(null);
    let active = true;
    let errorMessages = [];
    const basePath = `families/${familyId}`;
    const today = dayjs().startOf("day");
    const startOfRecentPeriod = today.subtract(RECENT_DAYS, "day");
    const endOfUpcomingPeriod = today.add(UPCOMING_DAYS, "day");

    const unsubscribers = [
      // 1. Chores
      onSnapshot(
        query(
          collection(db, `${basePath}/chores`),
          orderBy("completedAt", "desc") // Fetch more to calculate accurately
        ),
        (snapshot) => {
          if (!active) return;
          const allChoresFromSnapshot = snapshot.docs.map((d) => ({
            ...d.data(),
            id: d.id,
          }));

          const completedInPeriod = allChoresFromSnapshot.filter(
            (chore) =>
              chore.done &&
              chore.completedAt &&
              dayjs(chore.completedAt.toDate()).isAfter(startOfRecentPeriod)
          );
          setChoresCompletedLast7DaysCount(completedInPeriod.length);
          setRecentChoresList(completedInPeriod.slice(0, ITEM_LIMIT));
        },
        (err) => {
          if (active) {
            console.error("Chores error: ", err);
            errorMessages.push("Chores");
            setError(errorMessages.join(", "));
          }
        }
      ),
      // 2. Maintenance Tasks
      onSnapshot(
        query(
          collection(db, `${basePath}/maintenanceTasks`),
          orderBy("dueDate", "asc")
        ),
        (snapshot) => {
          if (!active) return;
          const tasksData = snapshot.docs.map((d) => ({
            ...d.data(),
            id: d.id,
          }));

          setOverdueMaintenanceTasksCount(
            tasksData.filter(
              (task) =>
                task.dueDate && dayjs(task.dueDate.toDate()).isBefore(today)
            ).length
          );
          setDueThisWeekMaintenanceTasksCount(
            tasksData.filter(
              (task) =>
                task.dueDate &&
                dayjs(task.dueDate.toDate()).isBetween(
                  today,
                  endOfUpcomingPeriod,
                  "day",
                  "[]"
                )
            ).length
          );
          setUpcomingTasksList(
            tasksData
              .filter(
                (task) =>
                  task.dueDate &&
                  dayjs(task.dueDate.toDate()).isAfter(today.subtract(1, "day")) // Keep existing logic for list
              )
              .slice(0, ITEM_LIMIT)
          );
        },
        (err) => {
          if (active) {
            console.error("Tasks error: ", err);
            errorMessages.push("Maintenance");
            setError(errorMessages.join(", "));
          }
        }
      ),
      // 3. Shopping Lists
      onSnapshot(
        query(
          collection(db, `${basePath}/shoppingLists`),
          orderBy("createdAt", "asc") // Assuming primary list is the first one
          // If multiple lists, you might need to aggregate pending items across all.
          // For simplicity, this example still focuses on the first list for summary.
        ),
        (snapshot) => {
          if (!active) return;
          if (!snapshot.empty) {
            // Aggregate pending items from ALL lists for the stat
            let totalPending = 0;
            snapshot.docs.forEach((doc) => {
              const listData = doc.data();
              totalPending += (listData.items || []).filter(
                (item) => !item.done
              ).length;
            });
            setTotalPendingShoppingItems(totalPending);

            // For the detailed list, show items from the first list (as per original logic)
            const primaryList = {
              ...snapshot.docs[0].data(),
              id: snapshot.docs[0].id,
            };
            setShoppingSummaryList({
              name: primaryList.name || "Shopping List",
              items: (primaryList.items || [])
                .filter((item) => !item.done)
                .slice(0, ITEM_LIMIT),
            });
          } else {
            setTotalPendingShoppingItems(0);
            setShoppingSummaryList({ name: "Shopping List", items: [] });
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
      // 4. Recipes (Needed for Meal Plan)
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
      // 5. Meal Plan
      onSnapshot(
        doc(db, `${basePath}/mealPlans`, FAMILY_MEAL_PLAN_DOC_ID),
        (docSnap) => {
          if (!active) return;
          if (docSnap.exists()) {
            const plan = docSnap.data().meals || {};
            const todayStr = dayjs().format("YYYY-MM-DD");
            const tomorrowStr = dayjs().add(1, "day").format("YYYY-MM-DD");

            const todayMeals = plan[todayStr] || [];
            const tomorrowMeals = plan[tomorrowStr] || [];

            setMealsTodayCount(todayMeals.length);
            setMealsTomorrowCount(tomorrowMeals.length);
            setMealPlanTodayList(todayMeals); // For detailed list
            setMealPlanTomorrowList(tomorrowMeals); // For detailed list
          } else {
            setMealsTodayCount(0);
            setMealsTomorrowCount(0);
            setMealPlanTodayList([]);
            setMealPlanTomorrowList([]);
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
      // 6. Notes
      onSnapshot(
        query(
          collection(db, `${basePath}/notes`),
          orderBy("createdAt", "desc")
        ),
        (snapshot) => {
          if (!active) return;
          const allNotesFromSnapshot = snapshot.docs.map((d) => ({
            ...d.data(),
            id: d.id,
          }));

          const createdInPeriod = allNotesFromSnapshot.filter(
            (note) =>
              note.createdAt &&
              dayjs(note.createdAt.toDate()).isAfter(startOfRecentPeriod)
          );
          setNotesCreatedLast7DaysCount(createdInPeriod.length);
          setRecentNotesDetailedList(allNotesFromSnapshot.slice(0, ITEM_LIMIT)); // For detailed list
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

    // Simulating a master loading state, adjust if individual sections load much faster/slower
    const loadingPromises = unsubscribers.map(
      (unsub) =>
        new Promise((resolve) => {
          const tempUnsub = unsub; // To avoid ESLint issue with unsub in setTimeout
          // This is a bit hacky for onSnapshot, ideally you'd check if initial data has arrived for each
          // For now, just a timeout to ensure all listeners are attached.
          setTimeout(() => resolve(), 500);
        })
    );

    Promise.all(loadingPromises).then(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [familyId]);

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
    return recipe ? recipe.title : "Recipe loading...";
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
          {`Could not load some dashboard data. Failed sections: ${error}`}
        </Alert>
      )}
      <Title order={1} mb="xl">
        Family Dashboard
      </Title>

      {/* Stats Section */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg" mb="xl">
        <StatCard
          title="Chores Done (Last 7 Days)"
          value={choresCompletedLast7DaysCount.toString()}
          icon={<IconListCheck size={28} />}
          color="teal"
        />
        <StatCard
          title="Overdue Maintenance"
          value={overdueMaintenanceTasksCount.toString()}
          icon={<IconExclamationCircle size={28} />}
          color="red"
        />
        <StatCard
          title="Maintenance Due (Next 7 Days)"
          value={dueThisWeekMaintenanceTasksCount.toString()}
          icon={<IconCalendarEvent size={28} />}
          color="yellow"
        />
        <StatCard
          title="Pending Shopping Items"
          value={totalPendingShoppingItems.toString()}
          icon={<IconShoppingCart size={28} />}
          color="orange"
        />
        <StatCard
          title="Meals Planned Today"
          value={mealsTodayCount.toString()}
          icon={<IconToolsKitchen2 size={28} />}
          color="lime"
        />
        <StatCard
          title="Notes Created (Last 7 Days)"
          value={notesCreatedLast7DaysCount.toString()}
          icon={<IconNote size={28} />}
          color="grape" // Example color
        />
      </SimpleGrid>

      <Divider my="xl" label="Details & Quick View" labelPosition="center" />

      {/* Detailed Lists Section (Existing Structure) */}
      <Grid>
        <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
          <Paper shadow="sm" p="lg" radius="md" withBorder h="100%">
            <Group mb="md">
              <ThemeIcon size="lg" variant="light" color="teal">
                <IconListCheck size={24} />
              </ThemeIcon>
              <Title order={3}>Recently Completed Chores</Title>
            </Group>
            {recentChoresList.length > 0 ? (
              <List spacing="sm" size="sm">
                {recentChoresList.map((chore) => (
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
            ) : null}
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
          <Paper shadow="sm" p="lg" radius="md" withBorder h="100%">
            <Group mb="md">
              <ThemeIcon size="lg" variant="light" color="cyan">
                <IconTool size={24} />
              </ThemeIcon>
              <Title order={3}>Upcoming Maintenance</Title>
            </Group>
            {upcomingTasksList.length > 0 ? (
              <List spacing="sm" size="sm">
                {upcomingTasksList.map((task) => (
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
            ) : null}
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
          <Paper shadow="sm" p="lg" radius="md" withBorder h="100%">
            <Group mb="md">
              <ThemeIcon size="lg" variant="light" color="orange">
                <IconShoppingCart size={24} />
              </ThemeIcon>
              <Title order={3}>{shoppingSummaryList.name}</Title>
            </Group>
            {shoppingSummaryList.items.length > 0 ? (
              <List spacing="xs" size="sm">
                {shoppingSummaryList.items.map((item) => (
                  <List.Item
                    key={item.id || item.text} // Assuming items have unique IDs or text
                    icon={
                      <IconCircleDashed size={14} style={{ marginTop: 4 }} />
                    }
                  >
                    <Text>
                      {item.text} {item.quantity && `(${item.quantity})`}
                    </Text>
                  </List.Item>
                ))}
                {/* Indication if more items exist beyond the ITEM_LIMIT for this list */}
                {shoppingSummaryList.totalPending >
                  shoppingSummaryList.items.length && // You'd need totalPending for *this specific list* if showing details
                  (shoppingSummaryList.name !== "Shopping List" ||
                    shoppingSummaryList.items.length > 0) && ( // Avoid showing if it's the default placeholder
                    <Text size="xs" c="dimmed" mt="xs">
                      + more items on this list...
                    </Text>
                  )}
              </List>
            ) : totalPendingShoppingItems === 0 &&
              !loading &&
              (!error || !error.includes("Shopping")) ? (
              <Text c="dimmed">All items bought!</Text>
            ) : !loading && (!error || !error.includes("Shopping")) ? (
              <Text c="dimmed">No pending items or lists.</Text>
            ) : null}
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
          <Paper shadow="sm" p="lg" radius="md" withBorder h="100%">
            <Group mb="md">
              <ThemeIcon size="lg" variant="light" color="lime">
                <IconToolsKitchen2 size={24} />
              </ThemeIcon>
              <Title order={3}>Meals for Today</Title>
            </Group>
            {mealPlanTodayList.length > 0 ? (
              <List spacing="xs" size="sm">
                {mealPlanTodayList.map((meal) => (
                  <List.Item key={meal.instanceId}>
                    <Text>{getRecipeTitleById(meal.recipeId)}</Text>
                  </List.Item>
                ))}
              </List>
            ) : !loading && (!error || !error.includes("Meal Plan")) ? (
              <Text c="dimmed">No meals planned for today.</Text>
            ) : null}

            {mealPlanTomorrowList.length > 0 && (
              <>
                <Divider my="sm" label="Tomorrow" labelPosition="center" />
                <List spacing="xs" size="sm">
                  {mealPlanTomorrowList.map((meal) => (
                    <List.Item key={meal.instanceId}>
                      <Text>{getRecipeTitleById(meal.recipeId)}</Text>
                    </List.Item>
                  ))}
                </List>
              </>
            )}
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
          <Paper shadow="sm" p="lg" radius="md" withBorder h="100%">
            <Group mb="md">
              <ThemeIcon size="lg" variant="light" color="grape">
                <IconNote size={24} />
              </ThemeIcon>
              <Title order={3}>Recent Notes</Title>
            </Group>
            {recentNotesDetailedList.length > 0 ? (
              <Stack gap="xs">
                {recentNotesDetailedList.map((note) => (
                  <Paper
                    key={note.id}
                    p="xs"
                    radius="sm"
                    withBorder
                    style={{
                      backgroundColor:
                        note.color || "var(--mantine-color-body)",
                    }} // Fallback color
                  >
                    <Text fw={500} truncate>
                      {note.title || "Untitled Note"}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {note.content
                        ? note.content.length > 100
                          ? note.content.substring(0, 100) + "..."
                          : note.content.split("\n")[0]
                        : "No content"}
                    </Text>
                  </Paper>
                ))}
              </Stack>
            ) : !loading && (!error || !error.includes("Notes")) ? (
              <Text c="dimmed">No notes yet.</Text>
            ) : null}
          </Paper>
        </Grid.Col>
      </Grid>
    </Box>
  );
}
