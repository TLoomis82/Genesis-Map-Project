import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// Material that is waiting on permission lives in public/land/private/ on a developer's own
// machine (git ignores it). It is served by `npm run dev` only. This step removes it from every
// build, so it can never be deployed by accident.
function leaveOutPrivate(): Plugin {
  let outDir = "dist";
  return {
    name: "leave-out-private",
    apply: "build",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      rmSync(resolve(outDir, "land", "private"), { recursive: true, force: true });
    },
  };
}

export default defineConfig({
  plugins: [react(), leaveOutPrivate()],
  server: { port: 5173 },
});
