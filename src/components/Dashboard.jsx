// src/components/Dashboard.jsx
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
} from "@mantine/core";
import {
  IconCheck,
  IconClockHour4,
  IconListCheck,
  // IconCalendarEvent, // Removed (or keep if used elsewhere, but remove for events)
  IconTool,
  IconShoppingCart,
  IconToolsKitchen2,
  IconNote,
  IconCircleDashed,
} from "@tabler/icons-react";
import dayjs from "dayjs";

const RECENT_DAYS = 7;
const UPCOMING_DAYS = 7;

export default function Dashboard({
  chores,
  tasks,
  shoppingLists,
  // calendarEvents, // Removed
  mealPlan,
  notes,
}) {
  const recentlyCompletedChores = chores
    .filter(
      (chore) =>
        chore.done &&
        chore.completedAt &&
        dayjs(chore.completedAt).isAfter(dayjs().subtract(RECENT_DAYS, "day"))
    )
    .sort(
      (a, b) => dayjs(b.completedAt).valueOf() - dayjs(a.completedAt).valueOf()
    )
    .slice(0, 5);

  const upcomingMaintenanceTasks = tasks
    .filter(
      (task) =>
        task.dueDate && dayjs(task.dueDate).isAfter(dayjs().subtract(1, "day"))
    )
    .sort((a, b) => dayjs(a.dueDate).valueOf() - dayjs(b.dueDate).valueOf())
    .slice(0, 5);

  const getDueDateBadge = (dueDate) => {
    // Simplified as itemType 'event' is removed
    const today = dayjs().startOf("day");
    const date = dayjs(dueDate).startOf("day");

    if (date.isBefore(today)) return <Badge color="red">Overdue</Badge>;
    if (date.isSame(today)) return <Badge color="orange">Due Today</Badge>;
    if (date.isBefore(today.add(UPCOMING_DAYS, "day")))
      return <Badge color="yellow">Upcoming</Badge>;
    return <Badge color="blue">Later</Badge>;
  };

  const primaryShoppingList =
    shoppingLists && shoppingLists.length > 0 ? shoppingLists[0] : null;
  const shoppingListSummary = primaryShoppingList
    ? primaryShoppingList.items.filter((item) => !item.done).slice(0, 5)
    : [];

  // Removed upcomingEvents logic

  const todayStr = dayjs().format("YYYY-MM-DD");
  const tomorrowStr = dayjs().add(1, "day").format("YYYY-MM-DD");
  const todaysMeals = mealPlan && mealPlan[todayStr] ? mealPlan[todayStr] : [];
  const tomorrowsMeals =
    mealPlan && mealPlan[tomorrowStr] ? mealPlan[tomorrowStr] : [];

  const recentNotes = notes
    ? [...notes].sort((a, b) => b.id - a.id).slice(0, 3)
    : [];

  return (
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
          {recentlyCompletedChores.length > 0 ? (
            <List spacing="sm" size="sm">
              {recentlyCompletedChores.map((chore) => (
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
                      {dayjs(chore.completedAt).format("MMM D")}
                    </Text>
                  </Group>
                </List.Item>
              ))}
            </List>
          ) : (
            <Text c="dimmed">No chores completed recently.</Text>
          )}
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
          {upcomingMaintenanceTasks.length > 0 ? (
            <List spacing="sm" size="sm">
              {upcomingMaintenanceTasks.map((task) => (
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
                      <Text c="dimmed" size="xs">
                        {dayjs(task.dueDate).format("MMM D")}
                      </Text>
                    </Group>
                  </Group>
                </List.Item>
              ))}
            </List>
          ) : (
            <Text c="dimmed">No upcoming maintenance tasks.</Text>
          )}
        </Paper>
      </Grid.Col>

      {/* Shopping List Quick View */}
      <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
        <Paper shadow="md" p="lg" radius="md" withBorder h="100%">
          <Group mb="md">
            <ThemeIcon size="lg" variant="light" color="orange">
              <IconShoppingCart size={24} />
            </ThemeIcon>
            <Title order={3}>
              {primaryShoppingList ? primaryShoppingList.name : "Shopping List"}
            </Title>
          </Group>
          {primaryShoppingList && shoppingListSummary.length > 0 ? (
            <List spacing="xs" size="sm">
              {shoppingListSummary.map((item) => (
                <List.Item
                  key={item.id}
                  icon={<IconCircleDashed size={14} style={{ marginTop: 4 }} />}
                >
                  <Text>
                    {item.text} {item.quantity && `(${item.quantity})`}
                  </Text>
                </List.Item>
              ))}
              {primaryShoppingList.items.filter((i) => !i.done).length >
                shoppingListSummary.length && (
                <Text size="xs" c="dimmed" mt="xs">
                  +{" "}
                  {primaryShoppingList.items.filter((i) => !i.done).length -
                    shoppingListSummary.length}{" "}
                  more items...
                </Text>
              )}
            </List>
          ) : primaryShoppingList &&
            primaryShoppingList.items.filter((i) => !i.done).length === 0 ? (
            <Text c="dimmed">
              All items bought from {primaryShoppingList.name}!
            </Text>
          ) : (
            <Text c="dimmed">No active shopping lists or items.</Text>
          )}
        </Paper>
      </Grid.Col>

      {/* Meal Plan Quick View */}
      <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
        {" "}
        {/* Adjusted span to fill row if 3 items */}
        <Paper shadow="md" p="lg" radius="md" withBorder h="100%">
          <Group mb="md">
            <ThemeIcon size="lg" variant="light" color="lime">
              <IconToolsKitchen2 size={24} />
            </ThemeIcon>
            <Title order={3}>Meals for Today</Title>
          </Group>
          {todaysMeals.length > 0 ? (
            <List spacing="xs" size="sm">
              {todaysMeals.map((meal) => (
                <List.Item key={meal.id}>
                  <Text>
                    <strong>{meal.type}:</strong> {meal.description}
                  </Text>
                </List.Item>
              ))}
            </List>
          ) : (
            <Text c="dimmed">No meals planned for today.</Text>
          )}
          {tomorrowsMeals.length > 0 && (
            <>
              <Divider my="sm" label="Tomorrow" labelPosition="center" />
              <List spacing="xs" size="sm">
                {tomorrowsMeals.map((meal) => (
                  <List.Item key={meal.id}>
                    <Text>
                      <strong>{meal.type}:</strong> {meal.description}
                    </Text>
                  </List.Item>
                ))}
              </List>
            </>
          )}
        </Paper>
      </Grid.Col>

      {/* Notes Quick View */}
      <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
        {" "}
        {/* Adjusted span */}
        <Paper shadow="md" p="lg" radius="md" withBorder h="100%">
          <Group mb="md">
            <ThemeIcon size="lg" variant="light" color="yellow">
              <IconNote size={24} />
            </ThemeIcon>
            <Title order={3}>Recent Notes</Title>
          </Group>
          {recentNotes.length > 0 ? (
            <Stack gap="xs">
              {recentNotes.map((note) => (
                <Paper
                  key={note.id}
                  p="xs"
                  radius="sm"
                  withBorder
                  style={{
                    backgroundColor: `var(--mantine-color-${note.color.replace(
                      ".",
                      "-"
                    )})`,
                  }}
                >
                  <Text fw={500} truncate>
                    {note.title}
                  </Text>
                  <Text size="xs" c="dimmed" truncate>
                    {note.content.split("\n")[0]}
                  </Text>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Text c="dimmed">No notes yet.</Text>
          )}
        </Paper>
      </Grid.Col>
      {/* Empty column to help with layout if needed, or adjust spans above for 2 items per row on lg */}
      <Grid.Col span={{ base: 12, md: 6, lg: 4 }} />
    </Grid>
  );
}
