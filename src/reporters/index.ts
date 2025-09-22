import { NOAAReporter } from "./noaa";
import { Config } from "../config";
import { ServerAPI } from "@signalk/server-api";
import { BathymetrySource, Timeframe } from "../types";
import { CronJob } from 'cron';
import transform from "stream-transform";
import { correctForSensorPosition, toPrecision } from "../streams";
import { VesselInfo } from "../metadata";
import createDebug, { Debugger } from "debug";

export * from "./noaa";

export interface ReportOptions {
  debug?: ServerAPI["debug"]
}

export function createReporter(
  config: Config,
  source: BathymetrySource,
  vessel: VesselInfo,
  { debug = createDebug('signalk-bathymetry') }: ReportOptions = {}
) {
  const service = new NOAAReporter()

  // TODO: persist this
  let lastReport: Date = new Date(0);

  async function submit({ from, to }: Timeframe = { from: lastReport ?? new Date(0), to: new Date() }) {
    debug(`Reporting data from ${vessel.name} (${vessel.mmsi}) from ${from.toISOString()} to ${to.toISOString()}`)

    // TODO: iterate over timeframes (daily?) to avoid too much data at once

    const data = (await source.createReader({ from, to }))
      .compose(transform(correctForSensorPosition(config)))
      .compose(transform(toPrecision()));

    await service.submit(data, vessel, config);
    lastReport = to;
  }

  const job = new CronJob(
    // '0 0 * * *', // cronTime: every day at midnight
    '*/1 * * * *', // cronTime: every minute for testing
    submit,
    null, // onComplete
    false, // start
  );

  return {
    start() {
      job.start();
    },
    stop() {
      job.stop();
    },
    submit,
  }
}


export function createScheduler() {

}
