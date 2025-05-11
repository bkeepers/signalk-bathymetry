import { BathymetryData } from "./collector";
import { computeDestinationPoint } from "geolib"

// 5 decimal places for latitude and longitude = ~1.1m precision at the equator
export function toPrecision(n: number = 5) {
  return (data: BathymetryData) => {
    return {
      ...data,
      latitude: parseFloat(data.latitude.toFixed(6)),
      longitude: parseFloat(data.longitude.toFixed(6)),
    }
  }
}

export type SensorConfig = {
  gnss: { x: number, y: number };
  sounder: { x: number, y: number };
};

export function correctForSensorPosition(config: SensorConfig) {
  const { distance, bearing } = getOffsets(config);

  return ({ heading, ...data }: BathymetryData) => {
    // No heading data provided, or no position offset, so position can't be corrected
    if (heading === undefined || distance === 0) return data;

    // Convert heading from radians to degrees, and adjust for the offset bearing
    const sensorBearing = ((heading * 180 / Math.PI) + bearing) % 360;
    const corrected = computeDestinationPoint(data, distance, sensorBearing)

    return {
      ...data,
      ...corrected
    };
  }
}

/** Get the offsets between the gnss and the sounder */
export function getOffsets({ gnss, sounder }: SensorConfig) {
  // y offset is distance from bow as a positive number
  // e.g. gnss is 13m from bow, sounder is 3m from bow, so offset is 10m
  const dy = gnss.y - sounder.y;

  // x offset is distance from centerline, -ve to port, +ve to starboard
  // e.g. gnss is -1.5m, sounder is -0.5m, so offset is 1m
  const dx = sounder.x - gnss.x;

  return {
    dx,
    dy,
    distance: Math.abs(Math.sqrt(dx * dx + dy * dy)),
    bearing: (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360,
  }
}
