import React from "react"
import ReactDOM from "react-dom/client"
import { initDarkMode } from "./store/uiStore"
import App from "./App"

// Sync dark-mode class before first paint to avoid flash of wrong theme
initDarkMode()

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)