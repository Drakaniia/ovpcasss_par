<script lang="ts">
  import type { MonitoringPreviewSheet, MonitoringSheetRow } from '@par/shared';

  import { formatDate } from '$lib/format/datetime';

  /**
   * Workbook facsimile for the export review modal (phase 14 §3, revised): the
   * sheet as Excel lays it out — merged title in row 1, header in row 2, body
   * from row 3, column letters, row numbers, and the sheet tab. The cells and
   * the grid both come from the preview contract the workbook is written from,
   * so the facsimile inherits the source's column widths, row heights, and
   * reserved body rows instead of guessing at them.
   */
  let { sheet }: { sheet: MonitoringPreviewSheet } = $props();

  const DATE_KEYS = new Set(['dateReceived', 'activityDate', 'dateCompleted']);
  const CENTER_KEYS = new Set([
    'index',
    'trackingNumber',
    'level',
    'sdg',
    'totalStudents',
    'totalPic',
    'dateReceived',
    'activityDate',
    'dateCompleted',
  ]);

  const COLUMN_CHAR_WIDTH_PX = 7;

  /** Excel's own column-width formula, so a width lands where Excel puts it. */
  function columnPx(width: number): number {
    return Math.round(((256 * width + 18) / 256) * COLUMN_CHAR_WIDTH_PX);
  }

  /** Points to CSS pixels at 96 dpi, the height the workbook declares. */
  function pointPx(points: number): number {
    return Math.round((points * 96) / 72);
  }

  const columnCount = $derived(sheet.columns.length);
  const titleLines = $derived(sheet.title.split('\n').filter((line) => line.trim() !== ''));
  const titlePx = $derived(pointPx(sheet.layout.rowHeights.title));
  const headerPx = $derived(pointPx(sheet.layout.rowHeights.header));
  const bodyPx = $derived(pointPx(sheet.layout.rowHeights.body));
  /** The sheet's depth: its data, or the body rows the source reserves. */
  const bodyRows = $derived(Math.max(sheet.rows.length, sheet.layout.reservedRows));
  /** Row numbers of the reserved rows left blank below the data. */
  const blankRows = $derived(
    Array.from({ length: bodyRows - sheet.rows.length }, (_, index) => sheet.rows.length + 3 + index),
  );

  function columnLetter(index: number): string {
    return String.fromCharCode('A'.charCodeAt(0) + index);
  }

  function widthFor(index: number): number {
    return columnPx(sheet.layout.columnWidths[index] ?? 9.140625);
  }

  function cellValue(row: MonitoringSheetRow, key: string): string {
    const value = (row as unknown as Record<string, unknown>)[key];

    if (value === null || value === undefined || value === '') return '';

    if (DATE_KEYS.has(key) && typeof value === 'string') return formatDate(value);

    return String(value);
  }

  function alignFor(key: string): 'center' | 'left' {
    return CENTER_KEYS.has(key) ? 'center' : 'left';
  }
</script>

<div
  class="workbook"
  style="--title-h: {titlePx}px; --header-h: {headerPx}px; --body-h: {bodyPx}px"
>
  <div class="grid-scroll">
    <table class="sheet" aria-label="Workbook preview: {sheet.sheetName}">
      <caption class="sr-only">
        Workbook preview for {sheet.sheetName}. Title, header, and {sheet.rows.length}
        {sheet.rows.length === 1 ? 'data row' : 'data rows'}.
      </caption>
      <colgroup>
        <col style="width: 36px" />
        {#each sheet.columns as column, index (column.key)}
          <col style="width: {widthFor(index)}px" />
        {/each}
      </colgroup>

      <thead>
        <tr class="letters">
          <th class="corner" scope="col"><span class="sr-only">Row</span></th>
          {#each sheet.columns as column, index (column.key)}
            <th scope="col">{columnLetter(index)}</th>
          {/each}
        </tr>

        <tr class="title-row">
          <th class="row-no" scope="row">1</th>
          <td class="title-cell" colspan={columnCount}>
            {#each titleLines as line (line)}
              <span class="title-line">{line}</span>
            {/each}
          </td>
        </tr>

        <tr class="header-row">
          <th class="row-no" scope="row">2</th>
          {#each sheet.columns as column (column.key)}
            <td class="header-cell">{column.label}</td>
          {/each}
        </tr>
      </thead>

      <tbody>
        {#each sheet.rows as row (row.index)}
          <tr>
            <th class="row-no" scope="row">{row.index + 2}</th>
            {#each sheet.columns as column (column.key)}
              {@const value = cellValue(row, column.key)}
              <td class="cell cell-{alignFor(column.key)}" title={value || undefined}>{value}</td>
            {/each}
          </tr>
        {/each}

        {#each blankRows as rowNumber (rowNumber)}
          <tr class="blank-row">
            <th class="row-no" scope="row">{rowNumber}</th>
            {#each sheet.columns as column (column.key)}
              <td class="cell"></td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="tabs">
    <span class="tab active">{sheet.sheetName}</span>
    <span class="tab-note">
      All three sheets ship in the workbook; this one carries the rows.
      {#if sheet.total > sheet.rows.length}
        Previewing {sheet.rows.length} of {sheet.total} rows.
      {/if}
    </span>
  </div>
</div>

<style>
  .workbook {
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* Tall enough for the dialog to read like a worksheet, never past the fold. */
  .grid-scroll {
    background: var(--surface-card);
    max-height: calc(100vh - 240px);
    overflow: auto;
    overscroll-behavior: contain;
  }

  .sheet {
    border-collapse: separate;
    border-spacing: 0;
    color: #1f1f1f;
    font-size: 11px;
    line-height: 1.3;
    table-layout: fixed;
    width: max-content;
    min-width: 100%;
  }

  thead {
    position: sticky;
    top: 0;
    z-index: 3;
  }

  th,
  td {
    border-bottom: 1px solid #d4d4d4;
    border-right: 1px solid #d4d4d4;
    padding: 3px 5px;
    vertical-align: middle;
  }

  .letters th {
    background: #ececec;
    color: #5a5a5a;
    font-size: 10px;
    font-weight: 500;
    height: 18px;
    padding: 0;
    text-align: center;
  }

  .corner {
    background: #e3e3e3;
    position: sticky;
    left: 0;
    z-index: 5;
  }

  .row-no {
    background: #f3f3f3;
    color: #6b6b6b;
    font-size: 10px;
    font-weight: 400;
    padding: 0 4px;
    position: sticky;
    left: 0;
    text-align: right;
    width: 36px;
    z-index: 2;
  }

  .title-row .row-no {
    background: #f3f3f3;
    z-index: 4;
  }

  /*
   * The workbook centres this merged heading across A1:R1. The facsimile
   * scrolls horizontally, so it is anchored left to stay readable instead of
   * sitting in the off-screen middle of an 18-column range.
   */
  .title-cell {
    background: var(--surface-card);
    border-bottom: 1px solid #d4d4d4;
    font-family: var(--font-document);
    font-size: 13px;
    font-style: italic;
    font-weight: 700;
    height: var(--title-h);
    padding: 6px 10px;
    text-align: left;
    vertical-align: middle;
  }

  .title-line {
    display: block;
    letter-spacing: 0.02em;
  }

  .header-row .row-no {
    z-index: 4;
  }

  .header-cell {
    background: var(--surface-card);
    font-family: var(--font-document);
    font-size: 10px;
    font-style: italic;
    font-weight: 700;
    height: var(--header-h);
    line-height: 1.2;
    overflow: hidden;
    text-align: center;
    white-space: normal;
  }

  .cell {
    background: var(--surface-card);
    height: var(--body-h);
    max-width: 240px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cell-center {
    text-align: center;
  }

  .cell-left {
    text-align: left;
  }

  .tabs {
    align-items: center;
    background: #f3f3f3;
    border-top: 1px solid var(--border);
    display: flex;
    flex: 0 0 auto;
    gap: 8px;
    padding: 4px 6px;
  }

  .tab {
    background: #f3f3f3;
    border: 1px solid var(--border);
    border-bottom: 0;
    border-radius: 4px 4px 0 0;
    color: #4a4a4a;
    font-size: 11px;
    padding: 3px 12px;
  }

  .tab.active {
    background: var(--surface-card);
    border-bottom: 2px solid var(--primary);
    color: var(--text-primary);
    font-weight: 600;
  }

  .tab-note {
    color: var(--text-secondary);
    font-size: 11px;
    margin-left: auto;
  }
</style>
