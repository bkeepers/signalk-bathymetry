import { NOAAReporter } from "./noaa.js";
import { Config } from "../config.js";
import { ServerAPI } from "@signalk/server-api";
import { CronJob } from "cron";
import { VesselInfo } from "../metadata.js";
import { BathymetrySource } from "../types.js";

export * from "./noaa.js";

export interface ReporterOptions {
  schedule?: string; // cron schedule string
}

export const { BATHY_URL = "https://depth.openwaters.io" } = process.env;
const DEFAULT_SCHEDULE = process.env.BATHY_REPORT_SCHEDULE ?? "0 0 * * *"; // every day at midnight

export function createReporter(
  app: ServerAPI,
  config: Config,
  vessel: VesselInfo,
  source: BathymetrySource,
  { schedule = DEFAULT_SCHEDULE }: ReporterOptions = {},
) {
  const service = new NOAAReporter(BATHY_URL, config, vessel);
  const job = new CronJob(schedule, report);

  async function report({
    from = source.lastReport ?? new Date(0),
    to = new Date(),
  } = {}) {
    app.debug(
      `Generating report from ${from.toISOString()} to ${to.toISOString()}`,
    );
    try {
      const data = await source.createReader({ from, to });
      app.debug(
        `Reporting data from ${vessel.name} (${vessel.mmsi}) to ${service.url}`,
      );
      const submission = await service.submit(data);
      app.debug("Submission response: %j", submission);
      app.setPluginStatus(`Reported at ${to.toISOString()}`);
      source.logReport?.({ from, to });
    } catch (err) {
      console.error(err);
      app.error(`Failed to generate or submit report: ${err}`);
      app.setPluginStatus(
        `Failed to report at ${to.toISOString()}: ${(err as Error).message}`,
      );
      return;
    }
  }

  return {
    start() {
      job.start();
      app.debug(`Starting reporter with schedule: ${schedule}`);
      app.debug(`Next report at ${job.nextDate()}`);
      app.setPluginStatus(`Next report at ${job.nextDate()}`);
    },
    stop() {
      app.debug(`Stopping reporter`);
      job.stop();
    },
  };
}
