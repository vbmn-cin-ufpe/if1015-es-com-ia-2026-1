import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom"
  },
  server: {
    // Forward all 404s to index.html so React Router can handle them
    historyApiFallback: true,
  },
})