import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), svgr()],
  css: {
    devSourcemap: true,
  },
  resolve: {
    tsconfigPaths: true,
  },
  // server: {
  //     allowedHosts: [
  //         "f4a4-2001-ee0-519a-62e0-d9db-7627-d09-c524.ngrok-free.app",
  //     ],
  // },
});
