import { ServerAPI, Plugin } from "@signalk/server-api";
import { schema, Config } from "./config";
import createCollector from "./collector";
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
      const source = createSqliteSource(app, config);
      const vessel = getVesselInfo(app)

      collector = createCollector(app, config, source);
      reporter = createReporter(config, source, vessel, app);

      collector.start().catch((err) => {
        // TODO: what is the right behavior on collector error? Restart?
        app.error("Bathymetry collector failed");
        app.error(err);
      });

      reporter.start()

      // // FIXME: Once https://github.com/SignalK/signalk-server/pull/1970 is merged,
      // // check for history API and fall back to using FileSource.
      // const history = new HistorySource({ config, datadir });
      // // Render the latest charts
      // app.debug("Rendering bathymetry charts");
      // render({ source: history, chartsdir, debug: app.debug as Debugger })
      //   .then(() => app.debug(`Bathymetry charts rendered in ${chartsdir}`))
      //   .catch((err) => app.error(err));
    },

    stop() {
      collector?.stop();
    },

    schema() {
      return schema(app);
    },
  };
}
