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

export const {
  NOAA_CSB_TOKEN = "test",
  NOAA_CSB_URL = "https://depth.openwaters.io",
} = process.env;

// https://www.ncei.noaa.gov/sites/g/files/anmtlf171/files/2024-04/SampleCSBFileFormats.pdf
export interface NOAAReporterOptions {
  url?: string;
  token?: string;
}

export class NOAAReporter {
  url: string;
  token: string;

  constructor(
    public config: Config,
    public vessel: VesselInfo,
    { url = NOAA_CSB_URL, token = NOAA_CSB_TOKEN }: NOAAReporterOptions = {},
  ) {
    this.url = url;
    this.token = token;
  }

  correctors() {
    return chain([correctForSensorPosition(this.config), toPrecision()]);
  }

  async submit(data: Readable): Promise<IncomingMessage> {
    const metadata: Metadata = getMetadata(this.vessel, this.config);
    const { uuid } = this.config.sharing;

    return new Promise<IncomingMessage>((resolve, reject) => {
      // Using external form-data package to support streaming
      const form = new StreamFormData();
      form.on("error", reject);

      const file = chain([
        data,
        this.correctors(),
        toXyz({ includeHeading: false }),
      ]);

      const prefix = `${uuid}-${new Date().toISOString()}`;
      form.append("metadataInput", JSON.stringify(metadata), {
        contentType: "application/json",
        filename: `${prefix}.json`,
      });
      form.append("file", file, {
        contentType: "application/csv",
        filename: `${prefix}.csv`,
      });

      const { hostname, pathname, port } = new URL("xyz", this.url);

      const params: SubmitOptions = {
        protocol: "https:",
        host: hostname,
        path: pathname,
        port: port,
        method: "POST",
        headers: this.token ? { "x-auth-token": this.token } : {},
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
      uniqueID: `SIGNALK-${config.sharing.uuid}`,
      ...(config.sharing.anonymous
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
