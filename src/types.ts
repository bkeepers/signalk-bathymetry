import { Readable } from "stream";
import { Config } from "./config";
import { ServerAPI } from "@signalk/server-api";

export type BathymetryData = {
  latitude: number;
  longitude: number;
  depth: number;
  timestamp: Date;
  heading?: number;
};

export interface BathymetrySourceOptions {
  config: Config;
  datadir: string;
}

export interface BathymetrySource extends BathymetrySourceOptions {
  start(app: ServerAPI): Promise<void>;
  stop(): void | Promise<void>;
  getStream(options: { from: string; to: string }): Promise<Readable>;
  getAvailableDates(): Promise<string[]>;
}
