export interface LogReport {
  lastReport: Date;
  report(at: Date): Promise<void>;
}

export function createReportLog(): LogReport {
  // TODO: persist lastReport
  let lastReport = new Date(0);

  return {
    get lastReport() {
      return lastReport;
    },
    async report(at: Date) {
      lastReport = at;
    }
  }
}
