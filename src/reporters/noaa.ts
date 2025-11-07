import StreamFormData, { type SubmitOptions } from "form-data";
import { toXyz } from "../streams/xyz.js";
import { text } from "stream/consumers";
import type { VesselInfo } from "../metadata.js";
import type { Readable } from "stream";
import type { IncomingMessage } from "http";
import { Config } from "../config.js";
import pkg from "../../package.json";
import { correctForSensorPosition, toPrecision } from "../streams/index.js";
import chain from "stream-chain";

const TOKEN = process.env.NOAA_CSB_TOKEN ?? "test";
const NOAA_CSB_URL =
  process.env.NOAA_CSB_URL ??
  "https://www.ngdc.noaa.gov/ingest-external/upload/csb/test/xyz";

// https://www.ncei.noaa.gov/sites/g/files/anmtlf171/files/2024-04/SampleCSBFileFormats.pdf
export interface NOAAReporterOptions {
  token?: string;
  url?: string;
}

export class NOAAReporter {
  token: string;
  url: string;

  constructor({ token = TOKEN, url = NOAA_CSB_URL }: NOAAReporterOptions = {}) {
    this.token = token;
    this.url = url;
  }

  correctors(config: Config) {
    return chain([correctForSensorPosition(config), toPrecision()]);
  }

  async submit(
    data: Readable,
    vessel: VesselInfo,
    config: Config,
  ): Promise<IncomingMessage> {
    const metadata: Metadata = getMetadata(vessel, config);

    return new Promise<IncomingMessage>((resolve, reject) => {
      // Using external form-data package to support streaming
      const form = new StreamFormData();
      form.on("error", reject);

      const file = chain([
        data,
        this.correctors(config),
        toXyz({ includeHeading: false }),
      ]);

      const prefix = `${config.uuid}-${new Date().toISOString()}`;
      form.append("metadataInput", JSON.stringify(metadata), {
        contentType: "application/json",
        filename: `${prefix}.json`,
      });
      form.append("file", file, {
        contentType: "application/csv",
        filename: `${prefix}.csv`,
      });

      const url = new URL(this.url);

      console.log("Submitting to", url.href);

      const params: SubmitOptions = {
        protocol: "https:",
        host: url.hostname,
        path: url.pathname,
        port: url.port,
        method: "POST",
        headers: {
          "x-auth-token": this.token,
        },
      };

      form.submit(params, async (err, res) => {
        if (err) {
          form.destroy(err);
          return reject(err);
        }

        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          return reject(
            new Error(
              `Unexpected status code ${res.statusCode} ${res.statusMessage}`,
            ),
          );
        }

        // Drain the response
        res.resume();
        const body = JSON.parse(await text(res));

        resolve(body);
      });
    });
  }
}

export type Metadata = ReturnType<typeof getMetadata>;

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
          position: [
            config.sounder?.x ?? 0,
            config.sounder?.y ?? 0,
            config.sounder?.z ?? 0,
          ],
          draft: config.sounder?.draft,
          frequency: config.sounder?.frequency,
          transducer: config.sounder?.transducer,
        },
        {
          type: "GNSS",
          make: config.gnss?.make,
          model: config.gnss?.model,
          position: [
            config.gnss?.x ?? 0,
            config.gnss?.y ?? 0,
            config.gnss?.z ?? 0,
          ],
        },
      ],
      correctors: {
        positionReferencePoint: "Transducer",
        draftApplied: true,
        // "positionOffsetsDocumented": true,
        // "soundSpeedDocumented": true,
        // "dataProcessed": true,
        // "motionOffsetsApplied": true,
      },
    },
  };
}
