import type { ReportDetail } from '@par/shared';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import NarrativeEditor from './NarrativeEditor.svelte';
import NarrativeMarkdown from './NarrativeMarkdown.svelte';

function detail(patch: Partial<ReportDetail> = {}): ReportDetail {
  return {
    id: 'report-1',
    referenceNo: 'AR No. 0001',
    createdByUserId: 'user-1',
    status: 'PENDING',
    version: 1,
    createdAt: '2026-10-24T00:00:00.000Z',
    updatedAt: '2026-10-24T00:00:00.000Z',
    form: {
      type: 'OFF_CAMPUS',
      classification: 'CURRICULAR',
      campusId: 'campus-1',
      unitId: 'unit-1',
      department: '',
      office: '',
      level: 'UNDERGRADUATE',
      title: 'Coastal cleanup',
      activityStartDate: '2026-10-21',
      activityEndDate: '2026-10-21',
      location: 'Brgy. Poblacion',
      activityCount: 1,
      totalStudents: 20,
      totalPic: 1,
      pics: [],
      sdgIds: [],
      narrative: '',
    },
    pics: [],
    attachments: [],
    receipts: [],
    canWriteNarrative: true,
    ...patch,
  } as ReportDetail;
}

/** SSR leaves hydration comment markers between nodes; assertions read the tags. */
function clean(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

function markdown(source: string): string {
  return clean(render(NarrativeMarkdown, { props: { source } }).body);
}

describe('NarrativeMarkdown', () => {
  it('renders headings, lists, and inline styles as semantic elements', () => {
    const body = markdown('# Summary\n\n- one\n- two\n\n1. first\n\n**bold** *soft* __drawn__');

    expect(body).toContain('<h3>');
    expect(body).toContain('<strong>bold</strong>');
    expect(body).toContain('<em>soft</em>');
    expect(body).toContain('<u>drawn</u>');
    expect(body).toContain('<ul>');
    expect(body).toContain('<ol>');
    expect(body).toContain('<li>one</li>');
  });

  it('keeps a line break inside one paragraph', () => {
    const body = markdown('One\nTwo');

    expect(body).toContain('One<br');
    expect(body).toContain('Two');
  });

  it('never renders raw markup from the narrative', () => {
    const body = markdown('<script>alert(1)</script>');

    expect(body).not.toContain('<script');
    expect(body).toContain('&lt;script>');
  });

  it('shows a quiet empty line before anything is written', () => {
    expect(markdown('   ')).toContain('No narrative text yet.');
  });
});

describe('NarrativeEditor', () => {
  it('renders the Write/Preview switch and formatting toolbar while editable', () => {
    const { body } = render(NarrativeEditor, {
      props: { detail: detail(), onreload: async () => {} },
    });

    expect(body).toContain('>Write</button>');
    expect(body).toContain('>Preview</button>');
    expect(body).toContain('aria-label="Narrative formatting"');
    expect(body).toContain('Submit narrative');
  });

  it('holds no editor or submit action on a decided record', () => {
    const { body } = render(NarrativeEditor, {
      props: { detail: detail({ status: 'APPROVED', canWriteNarrative: false }), onreload: async () => {} },
    });

    expect(body).toContain('read-only');
    expect(body).not.toContain('Submit narrative');
    expect(body).not.toContain('id="narrative"');
  });
});
