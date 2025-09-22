import { pipeline } from "stream/promises";
import { createLiveStream, toPrecision } from "./streams";
import { ServerAPI } from "@signalk/server-api";
import { Config } from "./config";
import { transform } from "stream-transform";
import { BathymetrySource } from "./types";

export default function createCollector(app: ServerAPI, config: Config, source: BathymetrySource) {
  let abortController: AbortController | undefined = undefined;

  return {
    async start() {
      // Source is not writable, so nothing to do
      if (!source.createWriter) return;

      abortController = new AbortController();

      return pipeline(
        createLiveStream(app, config),
        transform(toPrecision()),
        source.createWriter(),
        { signal: abortController.signal },
      );
    },

    stop() {
      abortController?.abort();
    }
  }
}
