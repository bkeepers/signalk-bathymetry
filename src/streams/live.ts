import { Delta, ServerAPI } from "@signalk/server-api";
import { Readable } from "stream";
import { Config } from "../config";

/** Maximum age of last position fix for a depth to be saved */
const ttl = 2000;

export function createLiveStream(app: ServerAPI, config: Config) {
  let offset = 0;
  if (config.path === "belowTransducer") offset += config.sounder?.z ?? 0;
  if (config.path === "belowKeel") offset += config.sounder?.draft ?? 0;

  const unsubscribes: (() => void)[] = [];

  return new Readable({
    objectMode: true,

    construct() {
      // Subscribe to data updates
      // @ts-expect-error: remove after next signalk release
      app.subscriptionmanager.subscribe(
        {
          context: "vessels.self",
          subscribe: [{ path: `environment.depth.${config.path}`, policy: "instant" }],
        },
        unsubscribes,
        (error: string) => app.error(error),
        (delta: Delta) => {
          delta.updates.forEach((update) => {
            const timestamp = new Date(update.timestamp ?? Date.now());
            const position = app.getSelfPath("navigation.position");
            const heading = app.getSelfPath("navigation.headingTrue");

            if ("values" in update) {
              update.values.forEach(({ value }) => {
                if (!value) return;
                const depth = (value as number) + offset;

                if (!position) return app.debug("No position data, ignoring depth data");
                if (!heading) return app.debug("No heading data, ignoring depth data");
                if (isStale(position, timestamp, ttl))
                  return app.debug("Stale position data, ignoring depth data");
                if (isStale(heading, timestamp, ttl))
                  return app.debug("Stale heading data, ignoring depth data");

                this.push({
                  longitude: position.value.longitude,
                  latitude: position.value.latitude,
                  depth,
                  timestamp,
                  heading: heading?.value,
                });
              });
            }
          });
        },
      );
    },
    destroy() {
      unsubscribes.forEach((f) => f());
    },
    read() {
      // This method is required for the Readable stream, but we don't need to implement it
      // because we are pushing data to the stream
    },
  });
}

function isStale(object: { timestamp: string }, timestamp: Date, ttl: number) {
  return !object?.timestamp || new Date(object.timestamp).valueOf() < timestamp.valueOf() - ttl;
}
