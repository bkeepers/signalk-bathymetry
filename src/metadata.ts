import { ServerAPI } from "@signalk/server-api";

export type VesselInfo = {
  mmsi?: string;
  imo?: string;
  name?: string;
  loa?: number;
  type?: string;
};

export function getVesselInfo(app: ServerAPI): VesselInfo {
  return {
    // @ts-expect-error remove after next signalk release
    mmsi: app.config.vesselMMSI,
    imo: app.getSelfPath("registrations.imo"),
    name: app.getSelfPath("name"),
    loa: app.getSelfPath("design.length.value")?.overall,
    type: app.getSelfPath("design.aisShipType.value")?.name,
  };
}
