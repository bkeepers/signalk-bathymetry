import { Delta, Position } from "@signalk/server-api";
import { Readable, ReadableOptions } from "stream";
import { Config } from "../config";

export type CollectorOptions = ReadableOptions & {
  /** Maximum age of last position fix for a depth to be saved */
  ttl: number;
};

export type BathymetryData = {
  latitude: number;
  longitude: number;
  depth: number;
  timestamp: Date;
  heading?: number;
};

/** Create a stream of bathymetry data from Signal K deltas */
export class Collector extends Readable {
  lastPosition: (Position & { timestamp: Date }) | undefined = undefined;
  lastHeading: { value: number; timestamp: Date } | undefined = undefined;

  /** Maximum age of last position fix for a depth to be saved */
  ttl: number = 2000;

  config: Config;

  constructor(config: Config, options: ReadableOptions = {}) {
    super({ ...options, objectMode: true });
    this.config = config;
  }

  get subscription() {
    return {
      context: "vessels.self",
      subscribe: [
        {
          path: "navigation.position",
          policy: "instant",
        },
        {
          path: `environment.depth.${this.config.path}`,
          policy: "instant",
        },
        {
          path: "navigation.headingTrue",
          policy: "instant",
        }
      ],
    };
  }

  onDepth(depth: number, timestamp: Date = new Date()) {
    if (!this.lastPosition) {
      this.emit("warning", new Error("Received depth data, but no position data."));
      return;
    }

    if (timestamp.valueOf() - this.lastPosition.timestamp.valueOf() > this.ttl) {
      this.emit("warning", new Error("Received depth data, but last position is too old."));
      return;
    }

    if (!this.lastHeading) {
      this.emit("warning", new Error("Received depth data, but no known heading."));
    } else if (timestamp.valueOf() - this.lastHeading.timestamp.valueOf() > this.ttl) {
      this.emit("warning", new Error("Received depth data, but last heading is too old."));
    }

    const { latitude, longitude } = this.lastPosition;

    const data: BathymetryData = {
      latitude,
      longitude,
      heading: this.lastHeading?.value,
      depth,
      timestamp,
    };

    // Push the data to the stream
    this.push(data);
  }

  // Handle the delta received from the subscription
  onDelta(delta: Delta) {
    delta.updates.forEach((update) => {
      if ("values" in update) {
        update.values.forEach(({ path, value }) => {
          if (!value) return;

          const timestamp = new Date(update.timestamp ?? Date.now());

          if (path === "navigation.position") {
            // Store the last position so it can be used when depth data is received
            this.lastPosition = { ...value as Position, timestamp };
          } else if (path === "navigation.headingTrue") {
            this.lastHeading = { value: value as number, timestamp };
          } else {
            let depth = value as number;

            // Adjust depth to surface
            if (path === "environment.depth.belowTransducer") {
              depth += this.config.sounder?.z ?? 0;
            } else if (path === "environment.depth.belowKeel") {
              depth += this.config.sounder?.draft ?? 0;
            }

            this.onDepth(depth, timestamp);
          }
        });
      }
    });
  }

  _read(size: number) {
    // This method is required for the Readable stream, but we don't need to implement it
    // because we are pushing data to the stream
  }
}
