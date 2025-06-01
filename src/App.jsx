// src/App.jsx
import React, { useState } from "react";
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
  Button, // For Sign Out
  LoadingOverlay, // For auth loading
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
  IconLogout,
} from "@tabler/icons-react";
import { useAuth } from "./contexts/AuthContext"; // Import useAuth
import { auth } from "./firebase"; // For signOut
import { signOut } from "firebase/auth";

const appVersion = import.meta.env.VITE_APP_VERSION || "0.0.0";

// Auth Pages (Import actual components)
import SignInPage from "./components/auth/SignInPage";
import SignUpPage from "./components/auth/SignUpPage";
import FamilyOnboardingPage from "./components/auth/FamilyOnboardingPage";

// Main App Components
import ChoreList from "./components/ChoreList";
import MaintenanceList from "./components/MaintenanceList";
import Dashboard from "./components/Dashboard";
import ShoppingList from "./components/ShoppingList";
import MealPlanner from "./components/MealPlanner";
import NotesBoard from "./components/NotesBoard";
import RecipeBookPage from "./components/RecipeBookPage";

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
  const [activeView, setActiveView] = useState("dashboard"); // Default view for logged-in users with family

  const { currentUser, userProfile, familyId, loadingAuth, authError } =
    useAuth();
  const [currentAuthPage, setCurrentAuthPage] = useState("signin"); // 'signin' or 'signup'

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // currentUser will become null via AuthContext
      setCurrentAuthPage("signin"); // Go back to signin page after logout
      setActiveView("dashboard"); // Reset view
    } catch (error) {
      console.error("Sign out error", error);
      // Handle sign out error if needed
    }
  };

  const renderAppContent = () => {
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
        return <ShoppingList />;
      case "notes":
        return <NotesBoard />;
      case "dashboard":
      default:
        return <Dashboard />;
    }
  };

  if (loadingAuth) {
    return (
      <LoadingOverlay visible={true} overlayProps={{ radius: "sm", blur: 2 }} />
    );
  }

  if (!currentUser) {
    // User is not logged in, show Sign In or Sign Up page
    if (currentAuthPage === "signin") {
      return (
        <SignInPage onSwitchToSignUp={() => setCurrentAuthPage("signup")} />
      );
    }
    return <SignUpPage onSwitchToSignIn={() => setCurrentAuthPage("signin")} />;
  }

  if (currentUser && userProfile && !familyId) {
    // User is logged in, but has no familyId - show onboarding
    return <FamilyOnboardingPage />;
  }

  // User is logged in and has a familyId
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
            <Title order={3}>
              {userProfile?.familyName ||
                (userProfile?.displayName
                  ? `${userProfile.displayName}'s Space`
                  : "Family Dashboard")}
            </Title>
          </Group>
          <Button
            variant="subtle"
            onClick={handleSignOut}
            leftSection={<IconLogout size={16} />}
          >
            Sign Out
          </Button>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Box mb="md">
          <UnstyledButton style={{ width: "100%" }}>
            <Group>
              <Avatar color="blue" radius="sm" src={currentUser.photoURL}>
                {userProfile?.displayName ? (
                  userProfile.displayName.charAt(0).toUpperCase()
                ) : (
                  <IconSettings size="1.5rem" />
                )}
              </Avatar>
              <div style={{ flex: 1 }}>
                <Text size="sm" fw={500}>
                  {userProfile?.displayName || currentUser.email}
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
                  ml="xs"
                >
                  {section.label}
                </Text>
              )}
              {section.links.map((link) => (
                <NavLink
                  key={link.label}
                  href="#"
                  label={link.label}
                  leftSection={<link.icon size={18} stroke={1.5} />}
                  active={activeView === link.view}
                  onClick={(event) => {
                    event.preventDefault();
                    setActiveView(link.view);
                    if (mobileOpened) toggleMobile();
                  }}
                  variant="filled"
                  radius="sm"
                />
              ))}
            </Box>
          ))}
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>{renderAppContent()}</AppShell.Main>
    </AppShell>
  );
}
