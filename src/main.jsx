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
    <MantineProvider
      theme={{
        primaryColor: "violet",
        fontFamily: "Inter, sans-serif",
        headings: { fontFamily: "Montserrat, sans-serif" },
        defaultRadius: "md",
        colors: {
          violet: [
            "#f3e8ff",
            "#e9d5ff",
            "#d8b4fe",
            "#c084fc",
            "#a855f7",
            "#9333ea",
            "#7c3aed",
            "#6d28d9",
            "#5b21b6",
            "#4c1d95",
          ],
          cyan: [
            "#ecfeff",
            "#cffafe",
            "#a5f3fc",
            "#67e8f9",
            "#22d3ee",
            "#06b6d4",
            "#0891b2",
            "#0e7490",
            "#155e75",
            "#164e63",
          ],
        },
        components: {
          Button: {
            styles: (theme, params) => ({
              root: {
                fontWeight: 600,
                letterSpacing: 0.5,
              },
            }),
          },
        },
      }}
      withGlobalStyles
      withNormalizeCSS
    >
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
