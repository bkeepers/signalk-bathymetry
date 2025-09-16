import { ServerAPI } from "@signalk/server-api";
import pkg from "../package.json";
import { Config } from "./config";

export type VesselInfo = {
  mmsi?: string;
  imo?: string;
  name?: string;
  loa?: number;
  type?: string;
};

export type Metadata = ReturnType<typeof getMetadata>;

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

// https://www.ncei.noaa.gov/sites/g/files/anmtlf171/files/2024-04/SampleCSBFileFormats.pdf
export function getMetadata(info: VesselInfo, config: Config) {
  return {
    crs: {
      horizontal: {
        type: "EPSG",
        value: 4326,
      },
      vertical: "Transducer",
    },
    providerContactPoint: {
      orgName: "Signal K",
      email: "info@signalk.org",
      logger: `${pkg.name} (${pkg.homepage})`,
      loggerVersion: pkg.version,
    },
    convention: "XYZ CSB 3.0",
    dataLicense: "CC0 1.0",
    platform: {
      uniqueID: `SIGNALK-${config.uuid}`,
      ...(config.anonymous
        ? {}
        : {
          type: info.type,
          name: info.name,
          length: info.loa,
          IDType: info.mmsi ? "MMSI" : info.imo ? "IMO" : undefined,
          IDNumber: info.mmsi ?? info.imo,
        }),
      sensors: [
        {
          type: "Sounder",
          make: config.sounder?.make,
          model: config.sounder?.model,
          position: [config.sounder?.x ?? 0, config.sounder?.y ?? 0, config.sounder?.z ?? 0],
          draft: config.sounder?.draft,
          frequency: config.sounder?.frequency,
          transducer: config.sounder?.transducer,
        },
        {
          type: "GNSS",
          make: config.gnss?.make,
          model: config.gnss?.model,
          position: [config.gnss?.x ?? 0, config.gnss?.y ?? 0, config.gnss?.z ?? 0],
        },
      ],
      correctors: {
        positionReferencePoint: "GNSS",
        // "soundSpeedDocumented": true,
        // "positionOffsetsDocumented": true,
        // "dataProcessed": true,
        // "motionOffsetsApplied": true,
        // "draftApplied": true
      },
    },
  };
}
