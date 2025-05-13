export * from "./sources";
export * from "./streams";
export * from "./types";
export * from "./config";
export * from "./renderer";

import createPlugin from "./plugin";

export default createPlugin;

// Set module.exports for CJS support
module.exports = createPlugin;
