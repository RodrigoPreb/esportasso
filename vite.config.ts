import { defineConfig } from "vite";

// O front chama "/api/..." e o Vite repassa para a API na porta 3000
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
