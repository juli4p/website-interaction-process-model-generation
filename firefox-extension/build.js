import * as esbuild from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";

const watchMode = process.argv.includes("--watch");

// delete and recreate the dist directory to ensure it's clean
await rm("dist", {
  recursive: true,
  force: true,
});
await mkdir("dist/sidebar", {
  recursive: true,
});

// html and css files are not bundled by esbuild, so we need to copy them manually
await Promise.all([
  cp("src/sidebar/sidebar.html", "dist/sidebar/sidebar.html"),

  cp("src/sidebar/sidebar.css", "dist/sidebar/sidebar.css"),
]);

// builds the extension from src into dist, bundling all dependencies into one file per entry point
const buildContext = await esbuild.context({
  entryPoints: {
    background: "src/background/index.js",
    content: "src/content/index.js",
    "sidebar/sidebar": "src/sidebar/index.js",
  },

  // bundle all dependencies into one file per e.p.
  bundle: true,
  outdir: "dist",
  // use old version to enable support for more browsers
  target: "firefox115",
  sourcemap: true,
  logLevel: "info",
});

// watch mode will keep the process running and rebuild on file changes (for dev)
if (watchMode) {
  await buildContext.watch();
  console.log("Watching source files...");
} else {
  await buildContext.rebuild();
  await buildContext.dispose();
}
