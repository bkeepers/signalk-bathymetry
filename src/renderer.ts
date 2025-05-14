import { createWriteStream, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { correctForSensorPosition, ToGeoJSON } from "./streams";
import { chain } from "stream-chain";
import { finished } from "stream/promises";
import { BathymetryData, BathymetrySource } from "./types";
import { useExtent } from "./useExtent";
import { contour, grid, mbtiles } from "./gdal";
import pMap from "p-map";
import { Config } from "./config";
import createDebug, { Debugger } from "debug";

export interface RenderOptions {
  source: BathymetrySource;
  chartsdir: string;
  debug?: Debugger;
}

export class Renderer {
  debug: Debugger;
  chartsdir: string;
  source: BathymetrySource;
  tmpdir: string;

  constructor({ source, chartsdir, debug = createDebug("bathymetry:render") }: RenderOptions) {
    this.debug = debug;
    this.chartsdir = chartsdir;
    this.source = source;
    this.tmpdir = join(source.datadir, "tmp");

    mkdirSync(this.tmpdir, { recursive: true });
    mkdirSync(this.chartsdir, { recursive: true });
  }

  async render() {
    const dates = await this.source.getAvailableDates();
    this.debug(`Rendering charts from ${dates.length} days of data`);

    const contours = await pMap(dates, (date) => this.createContour(date), { concurrency: 1 });

    const charts = join(this.chartsdir, "bathymetry.mbtiles");
    this.debug(`Creating mbtiles`);
    await mbtiles({ src: contours, dst: charts });
    this.debug(`Charts created in ${charts}`);
  }

  async createContour(date: string) {
    const from = new Date(date).toISOString();
    const to = new Date(new Date(date).setDate(new Date(date).getDate() + 1)).toISOString();

    const basename = join(this.tmpdir, date.split("T")[0]);
    const points = basename + "-points.geojson";
    const gridfile = basename + "-grid.tiff";
    const polygons = basename + "-polygons.geojson";

    // Bail if already generated
    if (existsSync(polygons)) {
      return polygons;
    }

    this.debug(`${date}: Converting bathymetry data for to GeoJSON points`);

    const [extent, setExtent] = useExtent();

    // Extract the data to geojson points
    await finished(
      chain([
        await this.source.getStream({ from, to }),
        createSanitizers(this.source.config),
        (data: BathymetryData) => {
          setExtent(data.longitude, data.latitude);
          return data;
        },
        new ToGeoJSON(),
        createWriteStream(points),
      ]),
    );

    this.debug(`${date}: Creating grid from points in ${points}`);
    await grid({ src: points, dst: gridfile, extent });

    // const lines = basename + '-lines.geojson'
    // await contour({ src: gridfile, dst: lines })

    this.debug(`${date}: Creating polygons from grid in ${gridfile}`);
    await contour({ src: gridfile, dst: polygons, p: true });

    this.debug(`${date}: Done creating contours`);
    return polygons;
  }
}

export async function render(options: RenderOptions) {
  return new Renderer(options).render();
}

export function createSanitizers(config: Config) {
  return chain([
    correctForSensorPosition(config),
    // My sounder outputs 42949672.9 if it can't read data. Maximum known ocean depth is <11000m
    (data: BathymetryData) => (data.depth < 11000 ? data : null),
  ]);
}
