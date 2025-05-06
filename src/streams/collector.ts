import { Delta, Position } from "@signalk/server-api";
import { Readable, ReadableOptions } from "stream";

export type CollectorOptions = ReadableOptions & {
  /** Maximum age of last position fix for a depth to be saved */
  ttl: number;

  /** Distance in meters from surface of the water to the transducer */
  surfaceToTransducer: number;
}

export type BathymetryData = {
  latitude: number;
  longitude: number;
  depth: number;
  timestamp: Date;
}

/** Create a stream of bathymetry data from Signal K deltas */
export class Collector extends Readable {
  subscription = {
    context: 'vessels.self',
    subscribe: [
      {
        path: 'navigation.position',
        policy: 'instant',
      },
      {
        path: 'environment.depth.*',
        policy: 'instant',
      }
    ]
  }

  lastPosition: Position & { timestamp: Date } | undefined = undefined;

  /** Maximum age of last position fix for a depth to be saved */
  ttl: number = 2000;

  /** Distance in meters from surface of the water to the transducer */
  surfaceToTransducer: number = 0;

  constructor(options: ReadableOptions = {}) {
    super({ ...options, objectMode: true });
  }

  onDepth(depth: number, timestamp: Date) {
    if (!this.lastPosition) {
      this.emit('warning', new Error('Received depth data, but no position data.'));
      return
    }

    if (timestamp.valueOf() - this.lastPosition.timestamp.valueOf() > this.ttl) {
      this.emit('warning', new Error('Received depth data, but last position is too old.'));
      return
    }

    const { latitude, longitude } = this.lastPosition;

    const data: BathymetryData = {
      latitude,
      longitude,
      depth,
      timestamp,
    };

    // Push the data to the stream
    this.push(data);
  }

  onPosition(position: Position, timestamp: Date) {
    // Store the last position so it can be used when depth data is received
    this.lastPosition = { ...position, timestamp };
  }

  // Handle the delta received from the subscription
  onDelta(delta: Delta) {
    delta.updates.forEach((update) => {
      if ('values' in update) {
        update.values.forEach(({ path, value }) => {
          if (path === 'navigation.position' && value) {
            this.onPosition(value as Position, new Date(update.timestamp!));
          } else if (path === 'environment.depth.belowTransducer' && value) {
            // TODO: get surfaceToTransducer from config
            this.onDepth(value as number + this.surfaceToTransducer, new Date(update.timestamp!));
          }
          // TODO: Handle other depth paths, unsubscribe from the ones we don't need
          // In order of preference:
          // environment.depth.belowSurface
          // environment.depth.belowKeel + design.draft
          // environment.depth.belowTransducer + depth.surfaceToTransducer
        })
      }
    })
  }

  _read(size: number) {
    // This method is required for the Readable stream, but we don't need to implement it
    // because we are pushing data to the stream
  }
}
