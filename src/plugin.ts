import { ServerAPI, Plugin } from "@signalk/server-api";
import { schema, Config } from "./config";
import { createCollector } from "./collector";
import { createReporter } from "./reporters";
import { createSqliteSource } from "./sources/sqlite";
import { getVesselInfo } from "./metadata";

export default function createPlugin(app: ServerAPI): Plugin {
  // FIXME: types
  let collector: ReturnType<typeof createCollector> | undefined = undefined;
  let reporter: ReturnType<typeof createReporter> | undefined = undefined;

  return {
    id: "bathymetry",
    name: "Bathymetry",
    description: "collect and share bathymetry data",

    async start(config: Config) {
      app.debug("Starting");
      const source = createSqliteSource(app, config);
      const vessel = getVesselInfo(app);

      collector = createCollector(app, config, source);
      reporter = createReporter(app, config, vessel, source);

      collector.start().catch((err) => {
        // TODO: what is the right behavior on collector error? Restart?
        app.error("Collector failed");
        app.error(err);
      });

      reporter.start();
    },

    stop() {
      collector?.stop();
    },

    schema() {
      return schema(app);
    },
  };
}
