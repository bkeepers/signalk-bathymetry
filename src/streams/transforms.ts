import { Transform } from "stream";
import { BathymetryData } from "./collector";

// 5 decimal places for latitude and longitude = ~1.1m precision at the equator
export function toPrecision(n: number = 5) {
  return new Transform({
    objectMode: true,
    transform(data: BathymetryData, encoding: string, callback) {
      this.push({
        ...data,
        latitude: parseFloat(data.latitude.toFixed(6)),
        longitude: parseFloat(data.longitude.toFixed(6)),
      });
      callback();
    }
  })
}
