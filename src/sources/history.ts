import { Config } from "../config";
import { parser } from "stream-json";
import { pick } from "stream-json/filters/Pick";
import { streamArray } from "stream-json/streamers/StreamArray";
import { chain } from "stream-chain";
import { Readable } from "stream";
import { BathymetrySource, Timeframe } from "../types";
import { ServerAPI } from "@signalk/server-api";

const DEFAULT_HOST = process.env.SIGNALK_HOST ?? "http://localhost:3000";

export function createHistorySource(app: ServerAPI, config: Config, options: HistorySourceOptions = {}): BathymetrySource {
  const { host = DEFAULT_HOST } = options;

  return {
    // History providers handle the recording of data themselves
    createWriter: undefined,

    createReader({ from, to }) {
      return createHistoryReader({ from, to, host, depthPath: config.path });
    }
  }
}

export interface HistoryReaderOptions extends Timeframe {
  host: string;
  depthPath: string
  resolution?: string; // in seconds, defaults to "1"
  context?: string;
}

export async function createHistoryReader(options: HistoryReaderOptions) {
  const { from, to, host, depthPath, resolution = "1", context = undefined } = options;

  const stream = await get({
    from: from.toISOString(),
    to: to.toISOString(),
    paths: [
      "navigation.position",
      `environment.depth.${depthPath}`,
      "navigation.headingTrue",
    ].join(","),
    resolution,
    context: context ?? ''
  });

  return Readable.from(
    chain([
      stream,
      ({ value }: { value: HistoryData }) => {
        const [timestamp, position, depth, heading] = value;

        if (depth !== null && position[0] !== null && position[1] !== null) {
          return {
            timestamp: new Date(timestamp),
            longitude: position?.[0],
            latitude: position?.[1],
            depth,
            heading,
          };
        }
      },
    ]),
  );

  /**
   * Get the list of dates that there is data for in the history.
   *
   * @param from - The start date of the range to get available dates for, defaults to 5 years ago
   * @param to - The end date of the range to get available dates for, defaults to now
   */
  async function getAvailableDates({
    to = new Date().toISOString(),
    from = new Date(new Date().setFullYear(new Date().getFullYear() - 5)).toISOString(),
  }: Partial<HistoryStreamOptions> = {}): Promise<string[]> {
    const stream = await get({
      from,
      to,
      paths: `environment.depth.${depthPath}`,
      resolution: "86400", // 1 day
    });
    return chain([
      stream,
      ({ value }: { value: [string, number | null] }) => {
        if (value[1]) return value[0];
      },
    ]).toArray();
  }

  async function get(query: Record<string, string>) {
    const url = new URL(`${host}/signalk/v1/history/values`);
    url.search = new URLSearchParams(query).toString();

    const response = await fetch(url);

    if (!response.ok || !response.body) {
      throw new Error(`Failed to fetch history: ${response.statusText}`);
    }

    return chain([response.body, parser(), pick({ filter: "data" }), streamArray()]);
  }
}

type HistoryData = [
  /** timestamp */
  string,
  /** position */
  [number | null, number | null],
  /** depth */
  number | null,
  /** heading */
  number | null,
];

export interface HistorySourceOptions {
  host?: string;
}

export type HistoryStreamOptions = {
  from: string;
  to: string;
};
