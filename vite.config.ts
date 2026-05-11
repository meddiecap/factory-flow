import { defineConfig } from "vitest/config"
import vue from "@vitejs/plugin-vue"
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
    base: "/factory-flow/",
    plugins: [tailwindcss(), vue()],
    test: {
        environment: "node",
    },
})
