import { describe, test, expect } from "vitest";
import { NOAAReporter, getMetadata, Config, BathymetryData } from "../../src/index.js";
import { Readable } from "stream";
import nock from "nock";
import { config, vessel } from "../helper.js";

nock.disableNetConnect();

// This is a real response from NOAA for a valid submission
const SUCCESS_RESPONSE = {
  success: true,
  message: "Submission successful.",
  submissionIds: ["60ba2ee8-04ee-45e4-b723-d54ee031ea47"],
};

describe("submit", () => {
  const reporter = new NOAAReporter({
    token: "test",
    url: "https://example.com/bathy",
  });

  const data: BathymetryData[] = [
    {
      longitude: -122.123,
      latitude: 37.123,
      depth: 10,
      timestamp: new Date("2024-01-01T00:00:00Z"),
    },
    {
      longitude: -122.124,
      latitude: 37.124,
      depth: 20,
      timestamp: new Date("2024-01-01T00:01:01Z"),
    },
    {
      longitude: -122.125,
      latitude: 37.125,
      depth: 30,
      timestamp: new Date("2024-01-01T00:02:02Z"),
    },
  ];

  test("success", async () => {
    const scope = nock("https://example.com").post("/bathy").reply(200, SUCCESS_RESPONSE);
    const res = await reporter.submit(Readable.from(data), vessel, config);
    expect(res).toEqual(SUCCESS_RESPONSE);
    expect(scope.isDone()).toBe(true);
  });

  test("bad stream", async () => {
    const stream = new Readable({
      read() {
        this.emit("error", new Error("Stream error"));
      },
    });
    await expect(reporter.submit(stream, vessel, config)).rejects.toThrowError("Stream error");
  });

  test("unauthorized", async () => {
    const scope = nock("https://example.com")
      .post("/bathy")
      .reply(403, {
        formErrors: ["Forbidden"],
        fieldErrors: {},
        message: "Forbidden",
        success: false,
      });
    await expect(reporter.submit(Readable.from(data), vessel, config)).rejects.toThrowError(
      "Unexpected status code 403 Forbidden",
    );
    expect(scope.isDone()).toBe(true);
  });

  test("bad response", async () => {
    const scope = nock("https://example.com").post("/bathy").reply(500);
    await expect(reporter.submit(Readable.from(data), vessel, config)).rejects.toThrowError(
      "Unexpected status code 500 Internal Server Error",
    );
    expect(scope.isDone()).toBe(true);
  });
});

describe("getMetadata", () => {
  const data = {
    mmsi: "123456789",
    imo: "987654321",
    name: "Test Vessel",
    loa: 10,
    type: "Sailing",
  };
  const config: Config = {
    path: "depthBelowService",
    uuid: "1",
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
