#!/usr/bin/env node

import { ToGeoJSON } from './streams/geojson.js';
import { fromXyz, ToXyz } from './streams/xyz';
import { pipeline } from 'stream/promises';
import { toPrecision } from './streams/transforms.js';

export async function xyzToGeoJSON({ input = process.stdin, output = process.stdout } = {}) {
  return pipeline(input, fromXyz(), toPrecision(5), new ToGeoJSON(), output);
}
