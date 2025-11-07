import { ServerAPI } from "@signalk/server-api";

export const vessel = {
  mmsi: "123456789",
  name: "Test Vessel",
  type: "Pleasure Craft",
  loa: 10,
};

export const config = {
  uuid: "1234",
  anonymous: false,
  path: "depthFromTransducer",
  sounder: { x: 1, y: 2, z: 3 },
  gnss: { x: 1, y: 2, z: 3 },
};

export const app = {
  debug: () => {},
  error: () => {},
  getDataDirPath: () => "",
  setPluginStatus: (status: string) => {},
} as unknown as ServerAPI;
