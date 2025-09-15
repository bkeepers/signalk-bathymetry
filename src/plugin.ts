import { ServerAPI, Plugin } from "@signalk/server-api";
import { schema, Config } from "./config";
import createCollector from "./collector";

export default function createPlugin(app: ServerAPI): Plugin {
  let collector = createCollector();

  return {
    id: "bathymetry",
    name: "Bathymetry",
    description: "collect and share bathymetry data",

    async start(config: Config) {
      collector.start(app, config);

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
      collector.stop();
    },

    schema() {
      return schema(app);
    },
  };
}
