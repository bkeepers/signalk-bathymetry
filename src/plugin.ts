import { ServerAPI, Plugin } from "@signalk/server-api";
import { schema, Config } from "./config";
import { render } from "./renderer";
import { HistorySource, FileSource } from "./sources";
import { BathymetrySource } from "./types";
import { join } from "path";
import { Debugger } from "debug";

export default function createPlugin(app: ServerAPI): Plugin {
  let source: BathymetrySource | undefined = undefined;

  return {
    id: "bathymetry",
    name: "Bathymetry",
    description: "collect and share bathymetry data",

    async start(config: Config) {
      const datadir = app.getDataDirPath();
      const chartsdir = join(datadir, "../../charts");

      source = new FileSource({ config, datadir });
      // Start the bathymetry data source
      app.debug("Starting bathymetry source");
      source.start(app).catch((err) => app.error(err));

      // FIXME: Once https://github.com/SignalK/signalk-server/pull/1970 is merged,
      // check for history API and fall back to using FileSource.
      const history = new HistorySource({ config, datadir });
      // Render the latest charts
      app.debug("Rendering bathymetry charts");
      render({ source: history, chartsdir, debug: app.debug as Debugger })
        .then(() => app.debug(`Bathymetry charts rendered in ${chartsdir}`))
        .catch((err) => app.error(err));
    },

    stop() {
      source?.stop();
    },

    schema() {
      return schema(app);
    },
  };
}
