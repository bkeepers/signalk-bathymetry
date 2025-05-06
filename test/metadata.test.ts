import { describe, expect, test } from "vitest";
import { getMetadata } from "../src/metadata";

describe("getMetadata", () => {
  const data = {
    mmsi: "123456789",
    imo: "987654321",
    name: "Test Vessel",
    loa: 10,
    type: "Sailing",
  };
  const config = {
    path: "depthBelowService",
    id: "1",
    sounder: { x: 0, y: 0, z: 0 },
    gnss: { x: 0, y: 0, z: 0 },
    anonymous: false,
  };

  test("includes platform data", () => {
    const metadata = getMetadata(data, config);
    expect(metadata.platform.uniqueID).toEqual("SIGNALK-1");
    expect(metadata.platform.IDNumber).toEqual("123456789");
    expect(metadata.platform.IDType).toEqual("MMSI");
    expect(metadata.platform.name).toEqual("Test Vessel");
    expect(metadata.platform.type).toEqual("Sailing");
  });

  test("anonymous does not include MMSI, name, etc", () => {
    const metadata = getMetadata(data, { ...config, anonymous: true });
    expect(metadata.platform.uniqueID).toEqual("SIGNALK-1");
    expect(metadata.platform.IDNumber).toBeUndefined();
    expect(metadata.platform.IDType).toBeUndefined();
    expect(metadata.platform.name).toBeUndefined();
    expect(metadata.platform.type).toBeUndefined();
  });
});
