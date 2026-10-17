import type { EmailContent } from '../provider';

export interface ReportEventData {
  trackingNumber: string;
  title: string;
  actorName: string;
  comments?: string;
}

export function submittedTemplate(data: ReportEventData): EmailContent {
  return {
    subject: `PAR ${data.trackingNumber} is ready for review`,
    text: `${data.actorName} submitted "${data.title}" (${data.trackingNumber}).`,
    html: `<p><strong>${data.actorName}</strong> submitted "${data.title}" (${data.trackingNumber}).</p>`,
  };
}

export function returnedTemplate(data: ReportEventData): EmailContent {
  return {
    subject: `PAR ${data.trackingNumber} was returned for revision`,
    text: `Comments: ${data.comments ?? '(none)'}`,
    html: `<p>Comments: ${data.comments ?? '(none)'}</p>`,
  };
}

export function endorsedTemplate(data: ReportEventData): EmailContent {
  return {
    subject: `PAR ${data.trackingNumber} is ready for approval`,
    text: `${data.actorName} endorsed "${data.title}" (${data.trackingNumber}).`,
    html: `<p><strong>${data.actorName}</strong> endorsed "${data.title}" (${data.trackingNumber}).</p>`,
  };
}

export function approvedTemplate(data: ReportEventData): EmailContent {
  return {
    subject: `PAR ${data.trackingNumber} is approved`,
    text: `"${data.title}" (${data.trackingNumber}) is approved. The acknowledgement is attached.`,
    html: `<p>"${data.title}" (${data.trackingNumber}) is approved. The acknowledgement is attached.</p>`,
  };
}
