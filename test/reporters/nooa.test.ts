import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import NOAAReporter from '../../src/reporters/noaa.js';
import { Readable } from 'stream';
import { toXyz, getMetadata, BathymetryData } from '../../src/index.js';
import { text } from 'stream/consumers';
import nock from 'nock'

nock.disableNetConnect();

describe('submit', () => {
  const reporter = new NOAAReporter({
    token: "test",
    url: "https://example.com/bathy"
  })

  const metadata = getMetadata(
    { name: "Test Vessel", type: "Pleasure Craft", loa: 10 },
    { uuid: "1234", anonymous: false, path: "depthFromTransducer", sounder: { x: 1, y: 2, z: 3 }, gnss: { x: 1, y: 2, z: 3 } }
  )

  const data: BathymetryData[] = [
    { longitude: -122.123, latitude: 37.123, depth: 10, timestamp: new Date("2024-01-01T00:00:00Z") },
    { longitude: -122.124, latitude: 37.124, depth: 20, timestamp: new Date("2024-01-01T00:01:01Z") },
    { longitude: -122.125, latitude: 37.125, depth: 30, timestamp: new Date("2024-01-01T00:02:02Z") },
  ]

  test('success', async () => {
    const scope = nock('https://example.com').post('/bathy').reply(200)
    const res = await reporter.submit(metadata, Readable.from(data).compose(toXyz()))
    expect(res.statusCode).toBe(200)
    expect(scope.isDone()).toBe(true)
  })

  test('bad stream', async () => {
    const stream = new Readable({ read() { this.emit('error', new Error("Stream error")) } })
    await expect(reporter.submit(metadata, stream)).rejects.toThrowError("Stream error");
  })

  test('bad response', async () => {
    const scope = nock('https://example.com').post('/bathy').reply(500)
    await expect(reporter.submit(metadata, Readable.from(data).compose(toXyz()))).rejects.toThrowError("Unexpected status code 500 Internal Server Error");
    expect(scope.isDone()).toBe(true)
  })
})
