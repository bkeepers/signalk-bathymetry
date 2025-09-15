import { pipeline } from "stream/promises";
import { createLiveStream, toPrecision, createSqliteWriter } from "./streams";
import { join } from "path";
import { ServerAPI } from "@signalk/server-api";
import { Config } from "./config";
import { transform } from "stream-transform";

export default function createCollector() {
  let abortController: AbortController | undefined = undefined;

  return {
    start(app: ServerAPI, config: Config) {
      abortController = new AbortController();

      return pipeline(
        createLiveStream(app, config),
        transform(toPrecision()),
        createSqliteWriter(join(app.getDataDirPath(), `${config.uuid}.sqlite`)),
        { signal: abortController.signal },
      );
    },

    stop() {
      abortController?.abort();
    }
  }
}
