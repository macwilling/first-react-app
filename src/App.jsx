// src/App.jsx
import { useState, useEffect } from "react";
import dayjs from "dayjs"; // Keep for other components if they use it
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

// Remove initialTasks - MaintenanceList will fetch from Firestore

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

  // Remove `tasks` state - MaintenanceList will manage its own via Firestore
  // const [tasks, setTasks] = useState(() => {
  //   const savedTasks = localStorage.getItem("familyTasks");
  //   return savedTasks ? JSON.parse(savedTasks) : initialTasks;
  // });

  // Keep other states that are still client-side for now
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

  // Remove localStorage for familyTasks
  // useEffect(() => {
  //   localStorage.setItem("familyTasks", JSON.stringify(tasks));
  // }, [tasks]);

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
        return <ChoreList />; // Already refactored
      case "maintenance":
        // MaintenanceList will now fetch and manage its own data from Firestore.
        return <MaintenanceList />;
      case "shopping":
        return (
          <ShoppingList
            shoppingListsData={shoppingLists}
            setShoppingListsData={setShoppingLists}
          />
        );
      case "meals":
        return (
          <MealPlanner mealPlanData={mealPlan} setMealPlanData={setMealPlan} />
        );
      case "notes":
        return <NotesBoard notesData={notes} setNotesData={setNotes} />;
      case "dashboard":
      default:
        return (
          <Dashboard
            // tasks prop will be removed or handled differently by Dashboard later
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
