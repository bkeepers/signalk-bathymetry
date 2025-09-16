export * from "./sources";
export * from "./streams";
export * from "./types";
export * from "./config";
export * from "./renderer";
export * from "./metadata";

import createPlugin from "./plugin";

// Set module.exports for CJS support
module.exports = createPlugin;
