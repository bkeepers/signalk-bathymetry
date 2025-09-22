import { Readable, Writable } from "stream";

export type Timeframe = { from: Date; to: Date };

export type BathymetryData = {
  latitude: number;
  longitude: number;
  depth: number;
  timestamp: Date;
  heading?: number;
};

export type CreateBathymetryWriter = () => Writable;
export type CreateBathymetryReader = (options: Timeframe) => Readable | Promise<Readable>;

export interface BathymetrySource {
  createWriter?: CreateBathymetryWriter;
  createReader: CreateBathymetryReader;
}
