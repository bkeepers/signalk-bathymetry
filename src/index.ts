import { ServerAPI, Plugin, Delta } from "@signalk/server-api";
import { schema, Config } from "./config";
import { Collector } from "./streams/collector";
import { ToXyz } from "./streams/xyz";
import { createWriteStream, existsSync } from "fs";
import { join } from "path";
import { pipeline } from "stream/promises";
import { writeMetadata } from "./metadata";

export default function (app: ServerAPI): Plugin {
  let unsubscribes: (() => void)[] = [];
  let abortController = new AbortController();

  return {
    id: "bathymetry",
    name: "Bathymetry",
    // @ts-expect-error: remove after next signalk release
    description: "collect and share bathymetry data",

    start(config: object) {
      app.debug("Bathymetry plugin started!");

      writeMetadata(app, config as Config);

      const filename = join(
        app.getDataDirPath(),
        "bathymetry-" + new Date().toISOString().split("T")[0] + ".csv",
      );

      // Initialize streams
      const collector = new Collector(config as Config);
      const xyz = new ToXyz({ header: !existsSync(filename) });
      const file = createWriteStream(filename);

      // Pipe them together
      pipeline(
        collector,
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
    },

    stop() {
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
