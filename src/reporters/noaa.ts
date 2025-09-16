import StreamFormData, { type SubmitOptions } from "form-data";
import type { Metadata } from "../metadata.js";
import type { Readable } from "stream";
import type { IncomingMessage } from "http";

const NOAA_URL = process.env.NOAA_URL ?? "https://www.ngdc.noaa.gov/ingest-external/upload/csb/test/xyz";

// https://www.ncei.noaa.gov/sites/g/files/anmtlf171/files/2024-04/SampleCSBFileFormats.pdf
export interface NOAAReporterOptions {
  token: string;
  url?: string;
}

export default class NOAAReporter {
  token: string;
  url: string;

  constructor({ token, url = NOAA_URL }: NOAAReporterOptions) {
    this.token = token;
    this.url = url;
  }

  async submit(metadata: Metadata, data: Readable) {
    return new Promise<IncomingMessage>((resolve, reject) => {
      // Using external form-data package to support streaming
      const form = new StreamFormData()
      form.append('metadataInput', JSON.stringify(metadata), { contentType: 'application/json' });
      form.append('file', data, { contentType: 'application/csv' });
      form.on('error', reject);

      const url = new URL(this.url)
      const params: SubmitOptions = {
        protocol: "https:",
        host: url.hostname,
        path: url.pathname,
        port: url.port,
        method: "POST",
        headers: {
          "x-auth-token": this.token
        }
      }

      form.submit(params, (err, res) => {
        if (err) return reject(err)

        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`Unexpected status code ${res.statusCode} ${res.statusMessage}`))
        }
        resolve(res);
      })
    })
  }
}
