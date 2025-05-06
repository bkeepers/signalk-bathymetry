import { describe, expect, test } from 'vitest';
import { ToXyz } from '../../src/streams/xyz';
import { Readable } from 'stream';
import { text } from 'stream/consumers';

describe('ToXyz', () => {
  test('converts data', async () => {
    const data = [
      { latitude: 1, longitude: 2, depth: 3, timestamp: new Date("2025-08-06T22:00:00.000Z") },
      { latitude: 4, longitude: 5, depth: 6, timestamp: new Date("2025-08-06T23:00:00.000Z") }
    ];
    const result = await text(Readable.from(data).compose(new ToXyz()));
    expect(result).toEqual([
      "LON,LAT,DEPTH,TIME\n",
      "1,2,3,2025-08-06T22:00:00.000Z\n",
      "4,5,6,2025-08-06T23:00:00.000Z\n"
    ].join(''));
  })
})
