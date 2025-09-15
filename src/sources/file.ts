import { join } from "path";
import { Config } from "../config";
import { ServerAPI } from "@signalk/server-api";
import { createLiveStream, toXyz, toPrecision } from "../streams";
import { createWriteStream, existsSync, writeFileSync } from "fs";
import { pipeline } from "stream/promises";
import { getMetadata, getVesselInfo } from "../metadata";
import { BathymetrySource, BathymetrySourceOptions } from "../types";
import { Readable } from "stream";
import { transform } from "stream-transform";

export class FileSource implements BathymetrySource {
  config: Config;
  datadir: string;
  abortController = new AbortController();

  constructor({ config, datadir }: BathymetrySourceOptions) {
    this.config = config;
    this.datadir = datadir;
  }

  start(app: ServerAPI) {
    const metaFilename = this.getFilename(new Date(), ".json");
    const dataFilename = this.getFilename(new Date(), ".csv");

    app.debug(`Writing bathymetery to ${dataFilename}`);

    const metadata = getMetadata(getVesselInfo(app), this.config);
    writeFileSync(metaFilename, JSON.stringify(metadata, null, 2));

    return pipeline(
      createLiveStream(app, this.config),
      transform(toPrecision()),
      toXyz({ header: !existsSync(dataFilename) }),
      createWriteStream(dataFilename, { flags: "a" }),
      { signal: this.abortController.signal },
    );

    // // Restart at midnight to log to a new file
    // restartTimer = setTimeout(restart, msToMidnight());
  }

  stop() {
    this.abortController.abort();
  }

  async getAvailableDates(): Promise<string[]> {
    // TODO: implmement this
    return []
  }

  async getStream() {
    // TODO: implement this
    return Readable.from([])
  }

  getFilename(date = new Date(), ext = ".csv") {
    return join(this.datadir, [date.toISOString().split("T")[0], this.config.uuid].join('-') + ext);
  }
}
