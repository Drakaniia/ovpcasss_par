import type { ReportFormInput, ReportStatus, ReportType } from '@par/shared';

export interface Report extends ReportFormInput {
  id: string;
  ownerUserId: string;
  type: ReportType;
  status: ReportStatus;
  version: number;
  trackingNumber: string | null;
  submittedAt: string | null;
  endorsedAt: string | null;
  approvedAt: string | null;
  approvedByUserId: string | null;
}
