// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";

import App from "./App";
import { AuthProvider } from "./contexts/AuthContext"; // Import AuthProvider

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MantineProvider defaultColorScheme="light">
      <DatesProvider settings={{ consistentWeeks: true }}>
        <AuthProvider>
          {" "}
          {/* Wrap App with AuthProvider */}
          <App />
        </AuthProvider>
      </DatesProvider>
    </MantineProvider>
  </React.StrictMode>
);
