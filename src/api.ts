import { Router } from "express";
import type { IRouter, NextFunction, Request, Response } from "express";
import proxy from "express-http-proxy";
import { v4 as uuidv4 } from "uuid";
import { NOAA_CSB_URL, NOAA_CSB_TOKEN } from "./reporters/noaa.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.BATHY_JWT_SECRET || "test";

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
  const { url = NOAA_CSB_URL, token = NOAA_CSB_TOKEN } = options;
  const proxyUrl = new URL("xyz", url);

  router.get("/", (req, res) => {
    res.json({ success: true, message: "API is reachable" });
  });

  router.post("/identify", (req, res) => {
    res.json(createIdentity());
  });

  /**
   * API to proxy requests to NOAA CSB XYZ upload endpoint, with authentication.
   *
   * @see https://www.ncei.noaa.gov/sites/g/files/anmtlf171/files/2024-04/GuidanceforSubmittingCSBDataToTheIHODCDB%20%281%29.pdf
   */
  router.use(
    "/xyz",
    verifyIdentity,
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

export function verifyIdentity(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Get token from the Authorization header (e.g., "Bearer <token>")
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "No token provided" });
  }

  // Verify the token
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: "Invalid token" });
    }
    // If verification is successful, attach the decoded payload to the request
    if (typeof decoded === "object" && "uuid" in decoded) {
      res.locals.uuid = decoded?.uuid;
    }
    next(); // Proceed to the next middleware or route handler
  });
}

export type JWTProps = {
  uuid: string;
};

export function createIdentity(uuid = uuidv4()) {
  return {
    uuid,
    token: jwt.sign({ uuid }, JWT_SECRET),
  };
}
