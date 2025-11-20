import { describe, test, expect, beforeAll } from "vitest";
import request from "supertest";
import express from "express";
import nock from "nock";
import { createApi, createIdentity } from "../src/api";

// This is a real response from NOAA for a valid submission
const SUCCESS_RESPONSE = {
  success: true,
  message: "Submission successful.",
  submissionIds: ["123"],
};

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

describe("POST /xyz", () => {
  test("rejects requests without token", async () => {
    await request(app)
      .post("/xyz")
      .expect("Content-Type", /json/)
      .expect(401)
      .expect({ success: false, message: "No token provided" });
  });

  test("rejects requests with malformed token", async () => {
    await request(app)
      .post("/xyz")
      .set("Authorization", "malformed-token")
      .expect("Content-Type", /json/)
      .expect(401)
      .expect({ success: false, message: "No token provided" });
  });

  test("rejects requests with invalid token", async () => {
    await request(app)
      .post("/xyz")
      .set("Authorization", "Bearer invalid-token")
      .expect("Content-Type", /json/)
      .expect(403)
      .expect({ success: false, message: "Invalid token" });
  });

  test("proxies to NOAA with valid token", async () => {
    const scope = nock("https://example.com")
      .post("/xyz")
      .matchHeader("x-auth-token", "test-token")
      .reply(200, SUCCESS_RESPONSE, { "Content-Type": "application/json" });

    await request(app)
      .post("/xyz")
      .set("Authorization", `Bearer ${createIdentity().token}`)
      .expect("Content-Type", /json/)
      .expect(200)
      .expect(SUCCESS_RESPONSE);

    expect(scope.isDone()).toBe(true);
  });
});

describe("POST /identify", () => {
  test("returns a token", async () => {
    await request(app)
      .post("/identify")
      .expect("Content-Type", /json/)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty("uuid");
        expect(res.body).toHaveProperty("token");
      });
  });
});
