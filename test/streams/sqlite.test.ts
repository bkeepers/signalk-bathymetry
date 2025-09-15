import { describe, expect, test } from "vitest";
import { createSqliteReader, createSqliteWriter } from "../../src/streams/sqlite";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import Database from "better-sqlite3";

test("reading and writing to sqlite", async () => {
  const data = [
    { latitude: 1, longitude: 2, depth: 3, timestamp: new Date("2025-08-06T22:00:00.000Z"), heading: 0 },
    // without heading
    { latitude: 4, longitude: 5, depth: 6, timestamp: new Date("2025-08-06T23:00:00.000Z") },

    // undefined heading
    { latitude: 4, longitude: 5, depth: 6, timestamp: new Date("2025-08-06T24:00:00.000Z"), heading: undefined },
  ];

  const database = new Database(":memory:");

  const writer = createSqliteWriter(database);
  await pipeline(Readable.from(data), writer);

  const reader = createSqliteReader(database);
  const result = await reader.toArray();
  expect(result.length).toBe(data.length);
  expect(result[0]).toEqual(data[0]);
  expect(result[1]).toEqual({ ...data[1], heading: null });
  expect(result[2]).toEqual({ ...data[2], heading: null });
});
