import { describe, test, expect, beforeAll } from "vitest";
import request from "supertest";
import express from "express";
import nock from "nock";
import { createApi } from "../src/api";

// This is a real response from NOAA for a valid submission
const SUCCESS_RESPONSE = {
  success: true,
  message: "Submission successful.",
  submissionIds: ["123"],
};

describe("POST /xyz", () => {
  const app = express();
  app.use(
    createApi({
      url: "https://example.com/bathy",
      token: "test-token",
    }),
  );

  beforeAll(() => {
    nock.enableNetConnect("127.0.0.1");
  });

  test("successfully proxies to NOAA", async () => {
    const scope = nock("https://example.com")
      .post("/bathy")
      .matchHeader("x-auth-token", "test-token")
      .reply(200, SUCCESS_RESPONSE, { "Content-Type": "application/json" });

    await request(app)
      .post("/xyz")
      .expect("Content-Type", /json/)
      .expect(200)
      .expect(SUCCESS_RESPONSE);

    expect(scope.isDone()).toBe(true);
  });
});
