// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";

import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MantineProvider defaultColorScheme="light">
      <DatesProvider settings={{ consistentWeeks: true }}>
        {" "}
        {/* Optional: consistent weeks for DatePicker */}
        <App />
      </DatesProvider>
    </MantineProvider>
  </React.StrictMode>
);
