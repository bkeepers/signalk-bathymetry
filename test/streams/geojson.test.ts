import { describe, expect, test } from "vitest";
import { ToGeoJSON } from "../../src/streams/geojson";
import { Readable } from "stream";
import { text } from "stream/consumers";

describe("ToGeoJSON", () => {
  test("converts data", async () => {
    const data = [
      { longitude: 1, latitude: 2, depth: 3, timestamp: new Date("2025-08-06T22:00:00.000Z") },
      { longitude: 4, latitude: 5, depth: 6, timestamp: new Date("2025-08-06T23:00:00.000Z") },
    ];
    const result = await text(Readable.from(data).compose(new ToGeoJSON()));
    expect(JSON.parse(result)).toEqual({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [1, 2] },
          properties: { depth: 3, time: "2025-08-06T22:00:00.000Z" },
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [4, 5] },
          properties: { depth: 6, time: "2025-08-06T23:00:00.000Z" },
        },
      ],
    });
  });
});
