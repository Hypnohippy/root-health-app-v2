import { buildSync } from "esbuild";

const bundle = buildSync({
  stdin: {
    contents: `import * as React from "react";
import * as ReactDOMClient from "react-dom/client";
import { flushSync } from "react-dom";
globalThis.React = React;
globalThis.ReactDOM = { ...ReactDOMClient, flushSync };`,
    resolveDir: process.cwd(),
    sourcefile: "root-health-react-browser-entry.js",
    loader: "js",
  },
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["chrome111"],
  write: false,
});

export const reactBrowserScripts = bundle.outputFiles[0].text;