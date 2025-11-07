#!/usr/bin/env node

import { parseArgs } from "node:util";
import { createHistorySource, fromXyz, NOAAReporter } from "../index.js";
import { homedir } from "node:os";
import { join } from "node:path";
import { createReadStream, readFileSync } from "node:fs";
import { Readable } from "node:stream";
import { ServerAPI } from "@signalk/server-api";

export async function run() {
  const { values } = parseArgs({
    options: {
      config: {
        type: "string",
        short: "c",
        default: join(
          homedir(),
          ".signalk",
          "plugin-config-data",
          "bathymetry.json",
        ),
      },
      to: { type: "string", short: "t", default: new Date().toISOString() },
      from: { type: "string", short: "s" },
      input: { type: "string", short: "i" },
      vessel: { type: "string", default: "vessel.json" },
    },
  });

  function getConfig() {
    const { configuration } = JSON.parse(
      readFileSync(values.config).toString(),
    );
    return configuration;
  }

  const config = getConfig();
  // TODO: get from API?
  const vessel = JSON.parse(readFileSync(values.vessel).toString());

  let data: Readable;

  if (values.input) {
    data = createReadStream(values.input).compose(fromXyz());
  } else {
    const source = createHistorySource({} as unknown as ServerAPI, config);
    const from = values.from ? new Date(values.from) : new Date();
    const to = values.to ? new Date(values.to) : new Date();
    data = await source.createReader({ from, to });
  }

  console.log(await new NOAAReporter().submit(data, vessel, config));
  // setImmediate(() => whyIsNodeRunning())
  // setInterval(() => whyIsNodeRunning(), 5000)
}

if (require.main === module) {
  run().catch(console.error);
}
