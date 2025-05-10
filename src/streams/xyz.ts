import { Transform, TransformCallback, TransformOptions } from "stream";
import { BathymetryData } from "./collector";
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

    if (header) this.push("LON,LAT,DEPTH,TIME\n");
  }

  _construct(callback: TransformCallback): void {
    callback();
  }

  _transform(data: BathymetryData, encoding: string, callback: TransformCallback) {
    const { latitude, longitude, depth, timestamp } = data;
    this.push([longitude, latitude, depth, timestamp.toISOString()].join(",") + "\n");
    callback();
  }
}

const XyzToBathymetry = {
  LAT: 'latitude',
  LON: 'longitude',
  DEPTH: 'depth',
  TIME: 'timestamp'
};

export function fromXyz() {
  return parse({
    cast: true,
    cast_date: true,
    columns(header: (keyof typeof XyzToBathymetry)[]) {
      return header.map(key => XyzToBathymetry[key] || key);
    }
  })
}
