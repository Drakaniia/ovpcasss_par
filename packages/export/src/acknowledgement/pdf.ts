export interface AcknowledgementData {
  trackingNumber: string;
  title: string;
  approverName: string;
  approvedAt: string;
  signatureImage: Uint8Array | null;
}

/** Renders the approval acknowledgement with pdf-lib (spec §7.10). Implemented in M4. */
export async function renderAcknowledgement(_data: AcknowledgementData): Promise<Uint8Array> {
  throw new Error('renderAcknowledgement is not implemented yet (M4)');
}
