#!/usr/bin/env node

import { ToGeoJSON } from "./streams/geojson.js";
import { fromXyz } from "./streams/xyz";
import { pipeline } from "stream/promises";
import { transform } from "stream-transform";
import { toPrecision } from "./streams/transforms.js";
import { BathymetryData } from "./index.js";

export async function xyzToGeoJSON({ input = process.stdin, output = process.stdout } = {}) {
  return pipeline(
    input,
    fromXyz(),
    transform(toPrecision()),
    // My sounder outputs 42949672.9 if it can't read data. Maximum known ocean depth is <11000m
    transform((data: BathymetryData) => (data.depth < 11000 ? data : null)),
    new ToGeoJSON(),
    output,
  );
}
