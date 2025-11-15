import { Router } from "express";
import type { IRouter } from "express";
import proxy from "express-http-proxy";

import { NOAA_CSB_URL, TOKEN } from "./reporters/noaa.js";

export type APIOptions = {
  url?: string;
  token?: string;
};

export function createApi(options: APIOptions = {}): IRouter {
  const router = Router();
  registerWithRouter(router, options);
  return router;
}

export function registerWithRouter(router: IRouter, options: APIOptions = {}) {
  const { url = NOAA_CSB_URL, token = TOKEN } = options;
  const proxyUrl = new URL(url);

  router.get("/", (req, res) => {
    res.json({ success: true, message: "API is reachable" });
  });

  /**
   * API to proxy requests to NOAA CSB XYZ upload endpoint, with authentication.
   *
   * @see https://www.ncei.noaa.gov/sites/g/files/anmtlf171/files/2024-04/GuidanceforSubmittingCSBDataToTheIHODCDB%20%281%29.pdf
   */
  router.use(
    "/xyz",
    proxy(proxyUrl.origin, {
      https: proxyUrl.protocol === "https:",
      proxyReqPathResolver: () => proxyUrl.pathname,
      proxyReqOptDecorator(reqOpts) {
        reqOpts.headers["x-auth-token"] = token;
        return reqOpts;
      },
    }),
  );
}
