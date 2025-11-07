import { NOAAReporter } from "./noaa";
import { Config } from "../config";
import { ServerAPI } from "@signalk/server-api";
import { CronJob } from 'cron';
import { VesselInfo } from "../metadata";
import { Readable } from "stream";
import { BathymetrySource } from "../types";
import { createReportLog } from "./log";

export * from "./noaa";

export interface ReporterOptions {
  schedule?: string; // cron schedule string
}

const DEFAULT_SCHEDULE = process.env.BATHY_REPORT_SCHEDULE ?? '0 0 * * *'; // every day at midnight

export function createReporter(
  app: ServerAPI,
  config: Config,
  vessel: VesselInfo,
  source: BathymetrySource,
  { schedule = DEFAULT_SCHEDULE }: ReporterOptions = {}
) {
  const service = new NOAAReporter();
  const job = new CronJob(schedule, report);
  const reportLog = createReportLog();

  async function report({ from = reportLog.lastReport, to = new Date() } = {}) {
    app.debug(`Generating report from ${from.toISOString()} to ${to.toISOString()}`);
    try {
      const data = await source.createReader({ from, to })
      await submit(data);
      app.debug('Report submitted successfully');
      app.setPluginStatus(`Reported at ${to.toISOString()}`);
      reportLog.report(to);
    } catch (err) {
      console.error(err);
      app.error(`Failed to generate or submit report: ${err}`);
      app.setPluginStatus(`Failed to report at ${to.toISOString()}: ${(err as Error).message}`);
      return;
    }
  }

  async function submit(data: Readable) {
    app.debug(`Reporting data from ${vessel.name} (${vessel.mmsi})`)
    await service.submit(data, vessel, config);
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
    submit,
  }
}
