import { DatabaseSync } from 'node:sqlite';
import { Readable, Writable } from 'stream';
import { BathymetryData } from '..';

export function createSqliteReader(database: DatabaseSync, { batchSize = 1000 } = {}) {
  const query = database.prepare('SELECT * FROM bathymetry ORDER BY timestamp LIMIT ? OFFSET ?');
  let offset = 0;

  return new Readable({
    objectMode: true,
    read() {
      let rows = 0;

      for (const row of query.iterate(batchSize, offset)) {
        rows++;

        this.push({
          longitude: row.longitude,
          latitude: row.latitude,
          depth: row.depth,
          timestamp: new Date(row.timestamp as number),
          heading: row.heading,
        } as BathymetryData);
      }

      offset += rows;

      if (rows < batchSize) this.push(null);
    }
  });
}

export function createSqliteWriter(database: DatabaseSync) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS bathymetry (
      longitude REAL,
      latitude REAL,
      depth REAL,
      timestamp TEXT,
      heading REAL
    )
  `);

  const stmt = database.prepare(`
        INSERT INTO bathymetry (longitude, latitude, depth, timestamp, heading)
        VALUES (:longitude, :latitude, :depth, :timestamp, :heading)
      `);

  return new Writable({
    objectMode: true,
    write(data: BathymetryData, encoding, callback) {
      try {
        stmt.run({
          longitude: data.longitude,
          latitude: data.latitude,
          depth: data.depth,
          timestamp: data.timestamp.toISOString(),
          heading: data.heading ?? null,
        });
        callback();
      } catch (err) {
        callback(err as Error);
      }
    }
  });
}
