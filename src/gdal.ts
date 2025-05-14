import { Extent, padExtent } from "./useExtent";
import { extname } from "path";

const NODATA = "0.0";

// The radius of a single data point relative to geo coordinates, e.g. 0.0002 deg = ~22m
const RADIUS = 0.00028;

// Hack to allow configuring path to commands
const commands = Object.fromEntries(['gdal_grid', 'gdal_contour', 'tippecanoe'].map((cmd) => {
  const path = process.env[`${cmd.toUpperCase()}_PATH`]
  return [cmd, path ? path.split(/\s+/) : [cmd]];
}));

export type GridOptions = {
  extent: Extent;
  src: string;
  dst?: string;
  fast?: boolean;
  resolution?: number;
  multiplier?: number;
};

export async function grid({
  src,
  dst = src.replace(extname(src), ".tiff"),
  extent,
  fast = false,
  resolution = fast ? 0.00001 : 0.0001,
  multiplier = 3.28084,
}: GridOptions) {
  // The algorithm to use for the grid
  // https://gdal.org/en/stable/programs/gdal_grid.html#interpolation-algorithms
  const algorithm = `invdist:radius=${RADIUS}:max_points=5:nodata=${NODATA}`;
  // const algorithm = `average:radius=${RADIUS}:nodata=${NODATA}`

  const { x, y } = padExtent(extent, 0.01);

  return exec(
    "gdal_grid",
    [
      "-txe",
      ...x,
      "-tye",
      ...y,
      "-tr",
      resolution,
      resolution,
      "-a",
      algorithm,
      "-z_multiply",
      multiplier,
      "-of",
      "GTiff",
      "-zfield",
      "depth",
      src,
      dst,
    ].map((n) => n.toString()),
  );
}

export type ContourOptions = {
  src: string;
  dst?: string;
  i?: number;
  p?: boolean;
};

export function contour({
  src,
  dst = src.replace(extname(src), "-lines.geojson"),
  i = 1,
  p = false,
}: ContourOptions) {
  return exec(
    "gdal_contour",
    [
      "-snodata",
      NODATA,
      "-i",
      i,
      ...(p ? ["-p", "-amin", "depth"] : ["-a", "depth"]),
      src,
      dst,
    ].map((n) => n.toString()),
  );
}

export type MBTilesOptions = {
  src: string[];
  dst: string;
};

export function mbtiles({ src, dst }: MBTilesOptions) {
  return exec("tippecanoe", [
    "-n",
    "Bathymetry",
    "-N",
    "Custom depth data from your own vessel",
    "-o",
    dst,
    "-zg",
    "--drop-densest-as-needed",
    "--force",
    ...src,
  ]);
}

async function exec(command: string, args: string[]) {
  // Execa is ESM-only
  const { execa } = await import("execa");

  const [cmd, ...preargs] = commands[command];

  return execa(
    cmd,
    [
      ...preargs,
      ...args.map((n) => n.toString())
    ],
    { verbose: "short", stdout: ["pipe", "inherit"] },
  );
}
