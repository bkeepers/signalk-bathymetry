import { describe, expect, test } from "vitest";
import { fromXyz, ToXyz } from "../../src/streams/xyz";
import { Readable } from "stream";
import { text } from "stream/consumers";

describe("ToXyz", () => {
  test("converts data", async () => {
    const data = [
      { latitude: 1, longitude: 2, depth: 3, timestamp: new Date("2025-08-06T22:00:00.000Z") },
      { latitude: 4, longitude: 5, depth: 6, timestamp: new Date("2025-08-06T23:00:00.000Z") },
    ];
    const result = await text(Readable.from(data).compose(new ToXyz()));
    expect(result).toEqual(
      [
        "LON,LAT,DEPTH,TIME\n",
        "2,1,3,2025-08-06T22:00:00.000Z\n",
        "5,4,6,2025-08-06T23:00:00.000Z\n",
      ].join(""),
    );
  });
});


describe("FromXyz", () => {
  test("converts data", async () => {
    const data = [
      "LAT,LON,DEPTH,TIME",
      "1,2,3,2025-08-06T22:00:00.000Z",
      "4,5,6,2025-08-06T23:00:00.000Z",
    ].join("\n");
    const result = await Readable.from(data).compose(fromXyz()).toArray();
    expect(result).toEqual([
      { latitude: 1, longitude: 2, depth: 3, timestamp: new Date("2025-08-06T22:00:00.000Z") },
      { latitude: 4, longitude: 5, depth: 6, timestamp: new Date("2025-08-06T23:00:00.000Z") },
    ]);
  });

  test("handles fields in different order", async () => {
    const data = [
      "LON,LAT,DEPTH,TIME",
      "1,2,3,2025-08-06T22:00:00.000Z",
    ].join("\n");
    const result = await Readable.from(data).compose(fromXyz()).toArray();
    expect(result).toEqual([
      { longitude: 1, latitude: 2, depth: 3, timestamp: new Date("2025-08-06T22:00:00.000Z") },
    ]);
  });
});
