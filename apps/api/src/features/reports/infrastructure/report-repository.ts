import type { Database } from '@par/db';

import type { Report } from '../domain/report';

export interface ReportRepository {
  findById(id: string): Promise<Report | null>;
  save(report: Report): Promise<void>;
}

export function createReportRepository(_db: Database): ReportRepository {
  throw new Error('createReportRepository is not implemented yet (M3)');
}
