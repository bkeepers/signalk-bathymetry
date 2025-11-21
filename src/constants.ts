export const {
  BATHY_URL = process.env.NODE_ENV === "production"
    ? "https://depth.openwaters.io"
    : "http://localhost:3001",
  BATHY_DEFAULT_SCHEDULE = "0 0 * * *", // every day at midnight
} = process.env;
