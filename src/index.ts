import { ServerAPI, Plugin, Delta } from "@signalk/server-api";
import { schema, Config } from "./config";
import { Collector } from "./streams/collector";
import { ToXyz } from "./streams/xyz";
import { toPrecision } from "./streams/transforms";
import { createWriteStream, existsSync, writeFileSync } from "fs";
import { join } from "path";
import { pipeline } from "stream/promises";
import { getMetadata, getVesselInfo } from "./metadata";

export default function bathymetery(app: ServerAPI): Plugin {
  let unsubscribes: (() => void)[] = [];
  let abortController = new AbortController();
  let restartTimer: number | undefined = undefined;

  return {
    id: "bathymetry",
    name: "Bathymetry",
    description: "collect and share bathymetry data",

    // @ts-expect-error: fix config type in server-api
    start(config: Config, restart) {
      const basename = [new Date().toISOString().split("T")[0], config.uuid].join('-');
      const prefix = join(app.getDataDirPath(), basename);
      const metaFilename = prefix + ".json";
      const dataFilename = prefix + ".csv";

      app.debug(`Writing bathymetery to ${prefix}`);

      const metadata = getMetadata(getVesselInfo(app), config);
      writeFileSync(metaFilename, JSON.stringify(metadata, null, 2));

      // Initialize streams
      const collector = new Collector(config as Config);
      const xyz = new ToXyz({ header: !existsSync(dataFilename) });
      const file = createWriteStream(dataFilename, { flags: "a" });

      // Pipe them together
      pipeline(
        collector,
        toPrecision(5),
        xyz,
        file,
        { signal: abortController.signal },
      ).catch((err) => app.error(err));

      // Subscribe to data updates
      // @ts-expect-error: remove after next signalk release
      app.subscriptionmanager.subscribe(
        collector.subscription,
        unsubscribes,
        (error: string) => app.error(error),
        (delta: Delta) => collector.onDelta(delta),
      );

      // The collector will emit a warning if the data is not valid
      // @ts-expect-error: remove after next signalk release
      collector.on("warning", (err: Error) => app.setPluginStatus(err));
      collector.on("data", () => app.setPluginStatus("Collecting bathymetry data"));

      // Restart at midnight to log to a new file
      restartTimer = setTimeout(restart, msToMidnight());
    },

    stop() {
      clearTimeout(restartTimer);
      abortController.abort();
      abortController = new AbortController();

      unsubscribes.forEach((f) => f());
      unsubscribes = [];
    },

    schema() {
      return schema(app);
    },
  };
}

function msToMidnight() {
  const now = new Date();
  return new Date(now).setHours(24, 0, 0, 0).valueOf() - now.valueOf();
}

// Set module.exports for CJS support
module.exports = bathymetery;
