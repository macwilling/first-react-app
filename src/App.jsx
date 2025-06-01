// src/App.jsx
import React, {
  useState, // No longer need useEffect for localStorage here
} from "react";
// import dayjs from "dayjs"; // Not directly used here anymore
import {
  AppShell,
  Burger,
  Group,
  NavLink,
  Title,
  ScrollArea,
  Text,
  Box,
  Avatar,
  UnstyledButton,
  Divider,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconHome,
  IconListCheck,
  IconTool,
  IconShoppingCart,
  IconToolsKitchen2,
  IconNote,
  IconBook2,
  IconSettings,
} from "@tabler/icons-react";

const appVersion = import.meta.env.VITE_APP_VERSION || "0.0.0";

import ChoreList from "./components/ChoreList";
import MaintenanceList from "./components/MaintenanceList";
import Dashboard from "./components/Dashboard";
import ShoppingList from "./components/ShoppingList"; // Will manage its own data
import MealPlanner from "./components/MealPlanner";
import NotesBoard from "./components/NotesBoard"; // Will manage its own data
import RecipeBookPage from "./components/RecipeBookPage";

// Initial data and localStorage logic for shoppingLists and notes are removed
// as components will handle their own data via Firestore.

const navSections = [
  {
    label: "Overview",
    links: [{ icon: IconHome, label: "Dashboard", view: "dashboard" }],
  },
  {
    label: "Household Tasks",
    links: [
      { icon: IconListCheck, label: "Chore Tracker", view: "chores" },
      { icon: IconTool, label: "Maintenance", view: "maintenance" },
    ],
  },
  {
    label: "Kitchen & Food",
    links: [
      { icon: IconBook2, label: "Recipe Book", view: "recipes" },
      { icon: IconToolsKitchen2, label: "Meal Planner", view: "meals" },
      { icon: IconShoppingCart, label: "Shopping Lists", view: "shopping" },
    ],
  },
  {
    label: "Utilities",
    links: [{ icon: IconNote, label: "Notes Board", view: "notes" }],
  },
];

export default function App() {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const [activeView, setActiveView] = useState("dashboard");

  // shoppingLists and notes state, and their useEffects for localStorage, are removed.

  const renderView = () => {
    switch (activeView) {
      case "chores":
        return <ChoreList />;
      case "maintenance":
        return <MaintenanceList />;
      case "recipes":
        return <RecipeBookPage />;
      case "meals":
        return <MealPlanner />;
      case "shopping":
        return <ShoppingList />; // No longer needs props for data
      case "notes":
        return <NotesBoard />; // No longer needs props for data
      case "dashboard":
      default:
        // Dashboard will now fetch its own data directly from Firestore
        // or from a shared context if that pattern is adopted later.
        return <Dashboard />;
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
            {/* Consider making "Family Dashboard" dynamic or based on app name */}
            <Title order={3}>Family Dashboard</Title>
          </Group>
          {/* User profile/settings icon can go here if needed */}
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Box mb="md">
          <UnstyledButton style={{ width: "100%" }}>
            <Group>
              <Avatar color="blue" radius="sm">
                {/* Placeholder Icon - replace with your actual logo/icon component if you have one */}
                <IconSettings size="1.5rem" />
              </Avatar>
              <div style={{ flex: 1 }}>
                <Text size="sm" fw={500}>
                  FamPlanner {/* Or your app's name */}
                </Text>
                <Text c="dimmed" size="xs">
                  v{appVersion}
                </Text>
              </div>
            </Group>
          </UnstyledButton>
        </Box>
        <Divider mb="md" />

        <AppShell.Section grow component={ScrollArea}>
          {navSections.map((section) => (
            <Box key={section.label} mb="md">
              {section.label && (
                <Text
                  size="xs"
                  tt="uppercase"
                  c="dimmed"
                  fw={700}
                  mb="xs"
                  ml="xs" // Slight indent for section labels
                >
                  {section.label}
                </Text>
              )}
              {section.links.map((link) => (
                <NavLink
                  key={link.label}
                  href="#" // Consider routing if this becomes a larger SPA
                  label={link.label}
                  leftSection={<link.icon size={18} stroke={1.5} />}
                  active={activeView === link.view}
                  onClick={(event) => {
                    event.preventDefault();
                    setActiveView(link.view);
                    if (mobileOpened) toggleMobile(); // Close mobile nav on selection
                  }}
                  variant="filled" // Or "light", "subtle" depending on theme preference
                  radius="sm" // Rounded corners for NavLinks
                />
              ))}
            </Box>
          ))}
        </AppShell.Section>
        {/* Footer in Navbar can go here if needed */}
      </AppShell.Navbar>

      <AppShell.Main>{renderView()}</AppShell.Main>
    </AppShell>
  );
}
