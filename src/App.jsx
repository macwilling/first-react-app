// src/App.jsx
import { useState, useEffect } from "react";
import dayjs from "dayjs";
import {
  AppShell,
  Burger,
  Group,
  NavLink,
  Title,
  ScrollArea,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconHome,
  IconListCheck,
  IconTool,
  IconShoppingCart,
  IconToolsKitchen2,
  IconNote,
} from "@tabler/icons-react";

import ChoreList from "./components/ChoreList";
import MaintenanceList from "./components/MaintenanceList";
import Dashboard from "./components/Dashboard";
import ShoppingList from "./components/ShoppingList";
import MealPlanner from "./components/MealPlanner";
import NotesBoard from "./components/NotesBoard";

// Remove initialChores, it will be handled by Firestore

const initialTasks = [
  // Keep this for now, will be refactored later
  {
    id: 1,
    title: "Replace HVAC Filter",
    dueDate: dayjs().add(5, "days").valueOf(),
  },
  { id: 2, title: "Clean Gutters", dueDate: dayjs().add(30, "days").valueOf() },
];

const initialShoppingLists = [
  // Keep this for now
  {
    id: "groceries",
    name: "Groceries",
    items: [
      {
        id: Date.now() + 1,
        text: "Milk",
        notes: "",
        quantity: "1 gallon",
        done: false,
      },
      {
        id: Date.now() + 2,
        text: "Bread",
        notes: "Whole wheat",
        quantity: "1 loaf",
        done: true,
      },
    ],
  },
  { id: "hardware", name: "Hardware Store", items: [] },
];

const initialMealPlan = {
  // Keep this for now
  [dayjs().format("YYYY-MM-DD")]: [
    { id: Date.now() + 5, type: "Breakfast", description: "Cereal and Fruit" },
    { id: Date.now() + 6, type: "Lunch", description: "Sandwiches" },
    { id: Date.now() + 7, type: "Dinner", description: "Chicken Stir-fry" },
  ],
  [dayjs().add(1, "day").format("YYYY-MM-DD")]: [
    { id: Date.now() + 8, type: "Dinner", description: "Tacos" },
  ],
};

const initialNotes = [
  // Keep this for now
  {
    id: Date.now() + 9,
    title: "Weekend Ideas",
    content: "- Park visit\n- Board games",
    color: "yellow.3",
  },
  {
    id: Date.now() + 10,
    title: "Gift List",
    content: "Alice: Book\nBob: Art supplies",
    color: "indigo.3",
  },
];

export default function App() {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const [activeView, setActiveView] = useState("dashboard");

  // Chores state will be managed by ChoreList with Firestore,
  // but App still needs to pass something or ChoreList needs to fetch itself.
  // For now, App.jsx won't hold chore data directly. ChoreList will fetch its own data.
  // We can pass setChores if ChoreList needs to update some aggregate data in App, but let's simplify.

  const [tasks, setTasks] = useState(() => {
    const savedTasks = localStorage.getItem("familyTasks");
    return savedTasks ? JSON.parse(savedTasks) : initialTasks;
  });
  const [shoppingLists, setShoppingLists] = useState(() => {
    const saved = localStorage.getItem("familyShoppingLists");
    return saved ? JSON.parse(saved) : initialShoppingLists;
  });
  const [mealPlan, setMealPlan] = useState(() => {
    const saved = localStorage.getItem("familyMealPlan");
    return saved ? JSON.parse(saved) : initialMealPlan;
  });
  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem("familyNotes");
    return saved ? JSON.parse(saved) : initialNotes;
  });

  // Remove localStorage for familyChores
  useEffect(() => {
    localStorage.setItem("familyTasks", JSON.stringify(tasks));
  }, [tasks]);
  useEffect(() => {
    localStorage.setItem("familyShoppingLists", JSON.stringify(shoppingLists));
  }, [shoppingLists]);
  useEffect(() => {
    localStorage.setItem("familyMealPlan", JSON.stringify(mealPlan));
  }, [mealPlan]);
  useEffect(() => {
    localStorage.setItem("familyNotes", JSON.stringify(notes));
  }, [notes]);

  const navLinks = [
    { icon: IconHome, label: "Dashboard", view: "dashboard" },
    { icon: IconListCheck, label: "Chore Tracker", view: "chores" },
    { icon: IconTool, label: "Maintenance", view: "maintenance" },
    { icon: IconShoppingCart, label: "Shopping Lists", view: "shopping" },
    { icon: IconToolsKitchen2, label: "Meal Planner", view: "meals" },
    { icon: IconNote, label: "Notes Board", view: "notes" },
  ];

  const renderView = () => {
    switch (activeView) {
      case "chores":
        // ChoreList will now fetch and manage its own data from Firestore.
        // We don't need to pass `chores` or `setChores` from App.jsx for Firestore integration.
        return <ChoreList />;
      case "maintenance":
        return <MaintenanceList tasks={tasks} setTasks={setTasks} />; // Will refactor later
      case "shopping":
        return (
          <ShoppingList
            shoppingListsData={shoppingLists}
            setShoppingListsData={setShoppingLists}
          />
        ); // Will refactor later
      case "meals":
        return (
          <MealPlanner mealPlanData={mealPlan} setMealPlanData={setMealPlan} />
        ); // Will refactor later
      case "notes":
        return <NotesBoard notesData={notes} setNotesData={setNotes} />; // Will refactor later
      case "dashboard":
      default:
        return (
          <Dashboard
            // chores prop will be removed or handled differently, as ChoreList fetches its own
            tasks={tasks}
            shoppingLists={shoppingLists}
            mealPlan={mealPlan}
            notes={notes}
          />
        );
    }
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 280,
        breakpoint: "sm",
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger
              opened={mobileOpened}
              onClick={toggleMobile}
              hiddenFrom="sm"
              size="sm"
            />
            <Burger
              opened={desktopOpened}
              onClick={toggleDesktop}
              visibleFrom="sm"
              size="sm"
            />
            <Title order={3}>Family Dashboard</Title>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppShell.Section grow component={ScrollArea}>
          {navLinks.map((link) => (
            <NavLink
              key={link.label}
              href="#"
              label={link.label}
              leftSection={<link.icon size={18} />}
              active={activeView === link.view}
              onClick={(event) => {
                event.preventDefault();
                setActiveView(link.view);
                if (mobileOpened) toggleMobile();
              }}
              variant="filled"
              tt="capitalize"
            />
          ))}
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>{renderView()}</AppShell.Main>
    </AppShell>
  );
}
