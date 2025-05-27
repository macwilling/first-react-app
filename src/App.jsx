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
  IconBook2, // <-- New Icon for Recipe Book
} from "@tabler/icons-react";

import ChoreList from "./components/ChoreList";
import MaintenanceList from "./components/MaintenanceList";
import Dashboard from "./components/Dashboard";
import ShoppingList from "./components/ShoppingList";
import MealPlanner from "./components/MealPlanner";
import NotesBoard from "./components/NotesBoard";
import RecipeBookPage from "./components/RecipeBookPage"; // <-- New Component Import

// Keep other initial data for components not yet refactored
const initialShoppingLists = [
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
  [dayjs().format("YYYY-MM-DD")]: [
    { id: Date.now() + 5, type: "Breakfast", description: "Cereal and Fruit" },
    { id: Date.now() + 6, type: "Lunch", description: "Sandwiches" },
    { id: Date.now() + 7, type: "Dinner", description: "Chicken Stir-fry" },
  ],
};
const initialNotes = [
  {
    id: Date.now() + 9,
    title: "Weekend Ideas",
    content: "- Park visit\n- Board games",
    color: "yellow.3",
  },
];

export default function App() {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const [activeView, setActiveView] = useState("dashboard"); // Default to dashboard

  // States for components still using localStorage
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
    { icon: IconBook2, label: "Recipe Book", view: "recipes" }, // <-- New NavLink
    { icon: IconToolsKitchen2, label: "Meal Planner", view: "meals" },
    { icon: IconShoppingCart, label: "Shopping Lists", view: "shopping" },
    { icon: IconNote, label: "Notes Board", view: "notes" },
  ];

  const renderView = () => {
    switch (activeView) {
      case "chores":
        return <ChoreList />;
      case "maintenance":
        return <MaintenanceList />;
      case "recipes": // <-- New Case
        return <RecipeBookPage />;
      case "meals":
        return (
          <MealPlanner mealPlanData={mealPlan} setMealPlanData={setMealPlan} />
        ); // Will be refactored
      case "shopping":
        return (
          <ShoppingList
            shoppingListsData={shoppingLists}
            setShoppingListsData={setShoppingLists}
          />
        ); // Will be refactored
      case "notes":
        return <NotesBoard notesData={notes} setNotesData={setNotes} />; // Will be refactored
      case "dashboard":
      default:
        return (
          <Dashboard
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
