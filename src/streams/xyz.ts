import { Transform, TransformCallback, TransformOptions } from "stream";
import { BathymetryData } from "../types";
import { parse } from "csv-parse";

/**
 * Converts BathymetryData to XYZ format.
 * https://www.ncei.noaa.gov/sites/g/files/anmtlf171/files/2024-04/GuidanceforSubmittingCSBDataToTheIHODCDB%20%281%29.pdf
 */
export class ToXyz extends Transform {
  constructor({ header = true, ...options }: TransformOptions & { header?: boolean } = {}) {
    super({
      ...options,
      readableObjectMode: false,
      writableObjectMode: true,
    });

    if (header) this.push("LON,LAT,DEPTH,TIME,HEAD\n");
  }

  _transform(data: BathymetryData, encoding: string, callback: TransformCallback) {
    const { latitude, longitude, depth, timestamp, heading } = data;
    this.push(
      [longitude, latitude, depth, timestamp.toISOString(), heading ?? ""].join(",") + "\n",
    );
    callback();
  }
}

const XyzToBathymetry = {
  LAT: "latitude",
  LON: "longitude",
  DEPTH: "depth",
  TIME: "timestamp",
  HEAD: "heading",
};

export function fromXyz() {
  return parse({
    cast_date: true,
    columns(header: (keyof typeof XyzToBathymetry)[]) {
      return header.map((key) => XyzToBathymetry[key] || key);
    },
    cast(value, context) {
      if (context.header) return value;
      if (value === "") return undefined;
      if (context.column === "timestamp") {
        return new Date(value);
      } else {
        return Number(value);
      }
    },
  });
}
