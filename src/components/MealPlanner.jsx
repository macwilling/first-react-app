// src/components/MealPlanner.jsx
import { useState } from "react";
import {
  Paper,
  Title,
  Button,
  Group,
  Modal,
  TextInput,
  Stack,
  ActionIcon,
  Text,
  Select,
  Box,
  Card,
  SimpleGrid,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useDisclosure } from "@mantine/hooks";
import dayjs from "dayjs";
import {
  IconPlus,
  IconTrash,
  IconPencil,
  IconToolsKitchen2,
  IconCalendar,
} from "@tabler/icons-react";

const mealTypes = ["Breakfast", "Lunch", "Dinner", "Snack"];
const initialPlan = {
  /* Example: [dayjs().format('YYYY-MM-DD')]: [{id:1, type:'Breakfast', description:'Oats'}] */
};

export default function MealPlanner({ mealPlanData, setMealPlanData }) {
  const [plan, setPlan] = useState(mealPlanData || initialPlan);
  const [opened, { open, close }] = useDisclosure(false);
  const [editingMeal, setEditingMeal] = useState(null); // {date: 'YYYY-MM-DD', meal: {id, type, description}}
  const [newMeal, setNewMeal] = useState({
    type: mealTypes[0],
    description: "",
    date: new Date(),
  });

  const handleDataChange = (updatedPlan) => {
    setPlan(updatedPlan);
    setMealPlanData(updatedPlan);
  };

  const handleOpenModal = (date, mealToEdit = null) => {
    const targetDate = dayjs(date).format("YYYY-MM-DD");
    if (mealToEdit) {
      setEditingMeal({ date: targetDate, meal: mealToEdit });
      setNewMeal({
        type: mealToEdit.type,
        description: mealToEdit.description,
        date: dayjs(targetDate).toDate(),
      });
    } else {
      setEditingMeal(null);
      setNewMeal({
        type: mealTypes[0],
        description: "",
        date: dayjs(targetDate).toDate(),
      });
    }
    open();
  };

  const handleSubmitMeal = () => {
    const targetDate = dayjs(newMeal.date).format("YYYY-MM-DD");
    const updatedPlan = { ...plan };

    if (!updatedPlan[targetDate]) {
      updatedPlan[targetDate] = [];
    }

    if (editingMeal) {
      // If date changed during edit, remove from old date
      if (editingMeal.date !== targetDate) {
        if (updatedPlan[editingMeal.date]) {
          updatedPlan[editingMeal.date] = updatedPlan[editingMeal.date].filter(
            (m) => m.id !== editingMeal.meal.id
          );
          if (updatedPlan[editingMeal.date].length === 0)
            delete updatedPlan[editingMeal.date];
        }
      }
      // Update/add to new date
      const mealIndex = updatedPlan[targetDate]
        ? updatedPlan[targetDate].findIndex((m) => m.id === editingMeal.meal.id)
        : -1;
      if (mealIndex > -1) {
        updatedPlan[targetDate][mealIndex] = {
          ...editingMeal.meal,
          type: newMeal.type,
          description: newMeal.description,
        };
      } else {
        updatedPlan[targetDate].push({
          id: editingMeal.meal.id,
          type: newMeal.type,
          description: newMeal.description,
        });
      }
    } else {
      updatedPlan[targetDate].push({
        id: Date.now(),
        type: newMeal.type,
        description: newMeal.description,
      });
    }
    handleDataChange(updatedPlan);
    close();
  };

  const deleteMeal = (dateString, mealId) => {
    const updatedPlan = { ...plan };
    if (updatedPlan[dateString]) {
      updatedPlan[dateString] = updatedPlan[dateString].filter(
        (meal) => meal.id !== mealId
      );
      if (updatedPlan[dateString].length === 0) {
        delete updatedPlan[dateString]; // Remove date entry if no meals left
      }
      handleDataChange(updatedPlan);
    }
  };

  // Display 7 days starting from today
  const displayDays = Array.from({ length: 7 }, (_, i) =>
    dayjs().add(i, "day")
  );

  return (
    <Paper shadow="md" p="lg" radius="md" withBorder>
      <Modal
        opened={opened}
        onClose={close}
        title={editingMeal ? "Edit Meal" : "Add Meal"}
        centered
      >
        <Stack>
          <DatePickerInput
            label="Date"
            value={newMeal.date}
            onChange={(value) => setNewMeal({ ...newMeal, date: value })}
          />
          <Select
            label="Meal Type"
            data={mealTypes}
            value={newMeal.type}
            onChange={(value) => setNewMeal({ ...newMeal, type: value })}
            allowDeselect={false}
          />
          <TextInput
            label="Description"
            placeholder="e.g., Spaghetti Bolognese"
            value={newMeal.description}
            onChange={(e) =>
              setNewMeal({ ...newMeal, description: e.currentTarget.value })
            }
            data-autofocus
          />
          <Button onClick={handleSubmitMeal} fullWidth mt="md">
            {editingMeal ? "Save Changes" : "Add Meal"}
          </Button>
        </Stack>
      </Modal>

      <Group justify="space-between" mb="xl">
        <Title order={2}>Meal Planner (Next 7 Days)</Title>
        {/* Optional: Button to add meal to a specific selected date beyond the 7 days */}
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
        {displayDays.map((day) => {
          const dateString = day.format("YYYY-MM-DD");
          const mealsForDay = plan[dateString] || [];
          return (
            <Card
              key={dateString}
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
            >
              <Card.Section withBorder inheritPadding py="xs">
                <Group justify="space-between">
                  <Text fw={500}>{day.format("ddd, MMM D")}</Text>
                  <ActionIcon
                    variant="light"
                    size="sm"
                    onClick={() => handleOpenModal(day.toDate())}
                  >
                    <IconPlus size={16} />
                  </ActionIcon>
                </Group>
              </Card.Section>
              <Stack mt="md" gap="xs">
                {mealTypes.map((type) => {
                  const mealsOfType = mealsForDay.filter(
                    (m) => m.type === type
                  );
                  return (
                    <Box key={type}>
                      <Text size="sm" fw={500} c="dimmed">
                        {type}
                      </Text>
                      {mealsOfType.length > 0 ? (
                        mealsOfType.map((meal) => (
                          <Paper
                            key={meal.id}
                            p="xs"
                            radius="sm"
                            withBorder
                            mt={2}
                          >
                            <Group justify="space-between">
                              <Text size="sm">{meal.description}</Text>
                              <Group gap={4}>
                                <ActionIcon
                                  variant="subtle"
                                  color="blue"
                                  size="xs"
                                  onClick={() =>
                                    handleOpenModal(day.toDate(), meal)
                                  }
                                >
                                  <IconPencil size={14} />
                                </ActionIcon>
                                <ActionIcon
                                  variant="subtle"
                                  color="red"
                                  size="xs"
                                  onClick={() =>
                                    deleteMeal(dateString, meal.id)
                                  }
                                >
                                  <IconTrash size={14} />
                                </ActionIcon>
                              </Group>
                            </Group>
                          </Paper>
                        ))
                      ) : (
                        <Text size="xs" c="dimmed">
                          -
                        </Text>
                      )}
                    </Box>
                  );
                })}
                {mealsForDay.length === 0 && (
                  <Text size="sm" c="dimmed">
                    No meals planned.
                  </Text>
                )}
              </Stack>
            </Card>
          );
        })}
      </SimpleGrid>
      {Object.keys(plan).length === 0 && (
        <Text c="dimmed" align="center" mt="xl">
          No meals planned yet. Click the '+' on a day card to add one!
        </Text>
      )}
    </Paper>
  );
}
