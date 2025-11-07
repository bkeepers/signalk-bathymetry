import Database from "better-sqlite3";
import { BathymetryData, BathymetrySource } from "../types.js";
import { Readable, Writable } from "stream";
import { ServerAPI } from "@signalk/server-api";
import { Config } from "../config.js";
import { join } from "path";

type BathymetryRow = {
  id: number;
  longitude: number;
  latitude: number;
  depth: number;
  timestamp: number;
  heading: number | null;
};

export function createSqliteSource(app: ServerAPI, config: Config): BathymetrySource {
  const filename = join(app.getDataDirPath(), `${config.uuid}.sqlite`);
  app.debug(`Creating SQLite source: ${filename}`);

  return {
    createWriter: () => createSqliteWriter(filename),
    createReader(options) {
      return createSqliteReader(filename, options);
    },
  };
}

export interface SqliteReaderOptions {
  batchSize?: number;
  from?: Date;
  to?: Date;
}

type QueryOptions = {
  limit: number;
  offset: number;
  from?: number;
  to?: number;
};

export function createSqliteReader(
  filename: string | Database.Database,
  options: SqliteReaderOptions = {},
) {
  const { batchSize = 1000, from = new Date(0), to = new Date() } = options;

  let offset = 0;
  let query: Database.Statement<QueryOptions, BathymetryRow>;

  return new Readable({
    objectMode: true,
    construct(callback) {
      try {
        const db = createDB(filename);

        query = db.prepare(`
          SELECT * FROM bathymetry
          WHERE timestamp >= :from AND timestamp <= :to
          ORDER BY timestamp
          LIMIT :limit OFFSET :offset
    `);
        callback();
      } catch (err) {
        callback(err as Error);
      }
    },
    read() {
      const rows = query.all({ limit: batchSize, offset, from: from.valueOf(), to: to.valueOf() });

      rows.forEach(({ id, timestamp, ...row }) => {
        this.push({ ...row, timestamp: new Date(timestamp) } as BathymetryData);
      });

      offset += rows.length;

      if (rows.length < batchSize) this.push(null);
    },
  });
}

export function createSqliteWriter(filename: string | Database.Database) {
  let stmt: Database.Statement<Omit<BathymetryRow, "id">>;

  return new Writable({
    objectMode: true,
    construct(callback) {
      try {
        const db = createDB(filename);

        stmt = db.prepare(`
          INSERT INTO bathymetry(longitude, latitude, depth, timestamp, heading)
          VALUES(:longitude, :latitude, :depth, :timestamp, :heading)
      `);

        callback();
      } catch (err) {
        callback(err as Error);
      }
    },

    write(data: BathymetryData, encoding, callback) {
      try {
        stmt.run({
          longitude: data.longitude,
          latitude: data.latitude,
          depth: data.depth,
          timestamp: data.timestamp.valueOf(),
          heading: data.heading ?? null,
        });
        callback();
      } catch (err) {
        callback(err as Error);
      }
    },
  });
}

export function createDB(filename: string | Database.Database) {
  const db = filename instanceof Database ? filename : new Database(filename);

  db.exec(`
    CREATE TABLE IF NOT EXISTS bathymetry(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      longitude REAL NOT NULL,
      latitude REAL NOT NULL,
      depth REAL NOT NULL,
      timestamp INTEGER NOT NULL,
      heading REAL
    );

    CREATE INDEX IF NOT EXISTS idx_bathymetry_timestamp ON bathymetry(timestamp);
    CREATE INDEX IF NOT EXISTS idx_bathymetry_location ON bathymetry(latitude, longitude);
  `);

  return db;
}
