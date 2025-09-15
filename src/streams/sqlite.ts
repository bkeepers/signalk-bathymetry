import Database from 'better-sqlite3';
import { BathymetryData } from '../types.js';
import { Readable, Writable } from 'stream';

type QueryOptions = {
  limit: number;
  offset: number;
}

type BathymetryRow = {
  id: number;
  longitude: number;
  latitude: number;
  depth: number;
  timestamp: string;
  heading: number | null;
}

export function createSqliteReader(filename: string | Database.Database, { batchSize = 1000 } = {}) {
  const db = filename instanceof Database ? filename : new Database(filename);

  const query = db.prepare<QueryOptions, BathymetryRow>(
    'SELECT * FROM bathymetry ORDER BY timestamp LIMIT :limit OFFSET :offset'
  );
  let offset = 0;

  return new Readable({
    objectMode: true,
    read() {
      const rows = query.all({ limit: batchSize, offset });

      rows.forEach(({ id, timestamp, ...row }) => {
        this.push({ ...row, timestamp: new Date(timestamp) } as BathymetryData)
      });

      offset += rows.length;

      if (rows.length < batchSize) this.push(null);
    }
  });
}

export function createSqliteWriter(filename: string | Database.Database) {
  const db = filename instanceof Database ? filename : new Database(filename);
  createStructure(db);

  const stmt = db.prepare(`
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

export function createStructure(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS bathymetry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      longitude REAL NOT NULL,
      latitude REAL NOT NULL,
      depth REAL NOT NULL,
      timestamp TEXT NOT NULL,
      heading REAL
    );

    CREATE INDEX IF NOT EXISTS idx_bathymetry_timestamp ON bathymetry (timestamp);
    CREATE INDEX IF NOT EXISTS idx_bathymetry_location ON bathymetry (latitude, longitude);
  `);
}
