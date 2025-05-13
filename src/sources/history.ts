import { Config } from "../config";
import { parser } from "stream-json";
import { pick } from "stream-json/filters/Pick";
import { streamArray } from "stream-json/streamers/StreamArray";
import { chain } from 'stream-chain';
import { Readable } from "stream";
import { BathymetrySource, BathymetrySourceOptions } from "../types";
import { ServerAPI } from "@signalk/server-api";

const DEFAULT_HOST = process.env.SIGNALK_HOST ?? 'http://localhost:3000';

export class HistorySource implements BathymetrySource {
  host: string;
  config: Config;
  datadir: string;

  constructor({ host = DEFAULT_HOST, config, datadir }: HistorySourceOptions) {
    this.datadir = datadir;
    this.host = host;
    this.config = config;
  }

  async start(app: ServerAPI) {
    app.debug(`Using bathymetry history from ${this.host}`);
    // The data is already being recorded by the history provider.
  }

  async stop() {
    // Nothing to do.
  }

  /**
   * Get the list of dates that there is data for in the history.
   *
   * @param from - The start date of the range to get available dates for, defaults to 5 years ago
   * @param to - The end date of the range to get available dates for, defaults to now
   */
  async getAvailableDates({
    to = new Date().toISOString(),
    from = new Date(new Date().setFullYear(new Date().getFullYear() - 5)).toISOString(),
  }: Partial<HistoryStreamOptions> = {}): Promise<string[]> {
    const stream = await this.get({
      from,
      to,
      paths: `environment.depth.${this.config.path}`,
      resolution: '86400', // 1 day
    })
    return chain([
      stream,
      ({ value }: { value: [string, number | null] }) => {
        if (value[1]) return value[0]
      }
    ]).toArray()
  }

  async getStream({ from, to }: HistoryStreamOptions) {
    const stream = await this.get({
      from,
      to,
      paths: [
        'navigation.position',
        `environment.depth.${this.config.path}`,
        'navigation.headingTrue',
      ].join(','),
      resolution: '1',
    })

    return Readable.from(chain([
      stream,
      ({ value }: { value: HistoryData }) => {
        const [timestamp, position, depth, heading] = value;

        if (depth !== null && position[0] !== null && position[1] !== null) {
          return {
            timestamp: new Date(timestamp),
            longitude: position?.[0],
            latitude: position?.[1],
            depth,
            heading
          };
        }
      }
    ]))
  }

  async get(query: Record<string, string>) {
    const url = new URL(`${this.host}/signalk/v1/history/values`);
    url.search = new URLSearchParams(query).toString();

    const response = await fetch(url)

    if (!response.ok || !response.body) {
      throw new Error(`Failed to fetch history: ${response.statusText}`);
    }

    return chain([
      response.body,
      parser(),
      pick({ filter: "data" }),
      streamArray(),
    ]);
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
  number | null
]

export interface HistorySourceOptions extends BathymetrySourceOptions {
  host?: string;
}

export type HistoryStreamOptions = {
  from: string;
  to: string;
}
