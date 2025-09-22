#!/usr/bin/env node

import { parseArgs, ParseArgsOptionsConfig } from 'node:util';
import { createHistorySource } from '../sources';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { createReporter } from '../reporters';

export async function run() {
  const { values, positionals } = parseArgs({
    options: {
      configdir: {
        type: 'string',
        short: 'c',
        default: join(homedir(), ".signalk"),
      },
    },
    allowPositionals: true
  });

  const command = positionals[0];
  const args = positionals.slice(1); // Arguments specific to the subcommand

  function getConfig() {
    const filename = join(values.configdir, "plugin-config-data", "bathymetry.json");
    const { configuration } = JSON.parse(readFileSync(filename).toString());
    return configuration;
  }

  switch (command) {
    case 'export':
    case 'report':
      await report(args);
      break;
    default:
      console.error(`Unknown subcommand: ${command}`);
      // Display help or exit
      break;
  }

  async function report(args: string[]) {
    const { values } = parseArgs({
      args,
      options: {
        to: { type: 'string', short: 't', default: new Date().toISOString() },
        from: { type: 'string', short: 's' },
        vessel: { type: 'string', default: "vessel.json" },
      },
    });
    const config = getConfig();
    const source = createHistorySource({} as any, config)
    // TODO: get from API?
    const vessel = JSON.parse(readFileSync(values.vessel).toString())

    const from = values.from ? new Date(values.from) : new Date();
    const to = values.to ? new Date(values.to) : new Date();

    await createReporter(config, source, vessel, { debug: console.log }).submit({ from, to });
  }
}

if (require.main === module) {
  run();
}
