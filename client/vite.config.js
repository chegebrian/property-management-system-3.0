// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Server configuration for development
  server: {
    port: 5173,
    host: true, // Listen on all addresses (needed for Docker/network access)

    // Proxy API requests to Flask backend
    proxy: {
      "/api": {
        target: "http://localhost:5555",
        changeOrigin: true,
        secure: false,
        // Optional: rewrite path if needed
        // rewrite: (path) => path.replace(/^\/api/, '/api')
      },
      "/health": {
        target: "http://localhost:5555",
        changeOrigin: true,
      },
    },

    // Hot Module Replacement
    hmr: {
      overlay: true,
    },

    // Auto-open browser
    open: true,
  },

  // Build configuration
  build: {
    outDir: "dist",
    sourcemap: true,
    // Chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Rollup options for optimization
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          charts: ["recharts"],
          icons: ["lucide-react"],
        },
      },
    },
  },

  // Resolve aliases for clean imports
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@pages": path.resolve(__dirname, "./src/pages"),
      "@contexts": path.resolve(__dirname, "./src/contexts"),
      "@hooks": path.resolve(__dirname, "./src/hooks"),
      "@utils": path.resolve(__dirname, "./src/utils"),
      "@styles": path.resolve(__dirname, "./src/styles"),
    },
  },

  // CSS configuration
  css: {
    devSourcemap: true,
    // PostCSS config if needed
    postcss: "./postcss.config.js",
  },

  // Environment variables prefix
  envPrefix: "VITE_",

  // Preview configuration (for production build testing)
  preview: {
    port: 4173,
    host: true,
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "axios",
      "recharts",
      "lucide-react",
    ],
  },

  // ESBuild configuration
  esbuild: {
    jsxInject: `import React from 'react'`,
  },
});
