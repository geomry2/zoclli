export interface PrintableField {
  label: string;
  value: string;
}

export interface PrintableNote {
  meta?: string;
  body: string;
}

export interface PrintableTable {
  headers: string[];
  rows: string[][];
}

export interface PrintableSection {
  title: string;
  fields?: PrintableField[];
  notes?: PrintableNote[];
  table?: PrintableTable;
}

export interface PrintableDocument {
  title: string;
  subtitle?: string;
  meta?: PrintableField[];
  sections: PrintableSection[];
}

export function openPrintableDocument(document: PrintableDocument): boolean {
  if (typeof window === 'undefined') return false;

  const popup = window.open('', '_blank');
  if (!popup) return false;

  popup.document.open();
  popup.document.write(renderPrintableDocumentHtml(document));
  popup.document.close();

  let printed = false;
  const triggerPrint = () => {
    if (printed) return;
    printed = true;
    popup.focus();
    popup.print();
  };

  popup.onafterprint = () => popup.close();
  window.setTimeout(triggerPrint, 120);

  return true;
}

export function renderPrintableDocumentHtml(document: PrintableDocument): string {
  const meta = document.meta?.length
    ? `<div class="doc-meta">${document.meta.map(field =>
        `<div class="meta-chip"><span class="meta-chip__label">${escapeHtml(field.label)}</span><span>${escapeHtml(field.value)}</span></div>`
      ).join('')}</div>`
    : '';

  const subtitle = document.subtitle
    ? `<p class="doc-subtitle">${escapeHtml(document.subtitle)}</p>`
    : '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(document.title)}</title>
    <style>
      :root {
        color-scheme: light;
      }

      * {
        box-sizing: border-box;
      }

      @page {
        size: A4;
        margin: 16mm;
      }

      body {
        margin: 0;
        font-family: "Helvetica Neue", Arial, sans-serif;
        color: #15202b;
        background: #ffffff;
      }

      .doc-shell {
        width: 100%;
      }

      .doc-header {
        padding-bottom: 14px;
        border-bottom: 2px solid #111827;
      }

      .doc-title {
        margin: 0;
        font-size: 28px;
        line-height: 1.15;
        font-weight: 700;
        letter-spacing: -0.03em;
      }

      .doc-subtitle {
        margin: 8px 0 0;
        font-size: 13px;
        line-height: 1.5;
        color: #52606d;
      }

      .doc-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 14px;
      }

      .meta-chip {
        display: inline-flex;
        gap: 8px;
        align-items: center;
        padding: 6px 10px;
        border: 1px solid #d9e2ec;
        border-radius: 999px;
        font-size: 11px;
        color: #334e68;
        background: #f8fafc;
      }

      .meta-chip__label {
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #7b8794;
      }

      .doc-section {
        margin-top: 22px;
        page-break-inside: avoid;
      }

      .section-title {
        margin: 0 0 10px;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #486581;
      }

      .field-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .field-card {
        padding: 12px 14px;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        background: #fcfdff;
      }

      .field-label {
        display: block;
        margin-bottom: 6px;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #7b8794;
      }

      .field-value {
        font-size: 14px;
        line-height: 1.5;
        color: #15202b;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .notes-list {
        display: grid;
        gap: 10px;
      }

      .note-card {
        padding: 12px 14px;
        border-left: 3px solid #1f2937;
        background: #f8fafc;
        border-radius: 0 12px 12px 0;
      }

      .note-meta {
        margin-bottom: 6px;
        font-size: 11px;
        font-weight: 700;
        color: #52606d;
      }

      .note-body {
        font-size: 13px;
        line-height: 1.55;
        color: #243b53;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .doc-table {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        overflow: hidden;
      }

      .doc-table thead {
        display: table-header-group;
      }

      .doc-table th,
      .doc-table td {
        padding: 10px 12px;
        border-bottom: 1px solid #e5e7eb;
        text-align: left;
        vertical-align: top;
        font-size: 12px;
        line-height: 1.45;
      }

      .doc-table th {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #52606d;
        background: #f8fafc;
      }

      .doc-table tr:last-child td {
        border-bottom: none;
      }

      .doc-table tr,
      .doc-table td {
        page-break-inside: avoid;
      }

      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }

      @media (max-width: 800px) {
        .field-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main class="doc-shell">
      <header class="doc-header">
        <h1 class="doc-title">${escapeHtml(document.title)}</h1>
        ${subtitle}
        ${meta}
      </header>
      ${document.sections.map(renderSection).join('')}
    </main>
  </body>
</html>`;
}

function renderSection(section: PrintableSection): string {
  const fields = section.fields?.length
    ? `<div class="field-grid">${section.fields.map(field =>
        `<div class="field-card"><span class="field-label">${escapeHtml(field.label)}</span><span class="field-value">${escapeHtml(field.value)}</span></div>`
      ).join('')}</div>`
    : '';

  const notes = section.notes?.length
    ? `<div class="notes-list">${section.notes.map(note =>
        `<article class="note-card">${note.meta ? `<div class="note-meta">${escapeHtml(note.meta)}</div>` : ''}<div class="note-body">${escapeHtml(note.body)}</div></article>`
      ).join('')}</div>`
    : '';

  const table = section.table
    ? `<table class="doc-table">
        <thead>
          <tr>${section.table.headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${section.table.rows.map(row => `<tr>${row.map(value => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>`
    : '';

  return `<section class="doc-section">
    <h2 class="section-title">${escapeHtml(section.title)}</h2>
    ${fields}
    ${notes}
    ${table}
  </section>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('\n', '<br />');
}
