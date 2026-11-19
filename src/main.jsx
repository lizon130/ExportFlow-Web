import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Saved theme apply kora (render er age, flash jate na hoy)
if (localStorage.getItem("theme") === "light") {
  document.documentElement.classList.add("theme-light");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
