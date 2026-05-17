import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:5001",
        changeOrigin: true,
      },
      "/socket.io": {
        target: process.env.VITE_API_URL || "http://localhost:5001",
        ws: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          socket: ["socket.io-client"],
          emoji: ["emoji-picker-react"],
        },
      },
    },
  },
});
