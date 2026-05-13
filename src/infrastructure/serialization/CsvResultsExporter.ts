export class CsvResultsExporter {
  toCsv(rows: Record<string, unknown>[]): string {
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    const escapeCell = (value: unknown): string => {
      const cell = value == null ? '' : String(value).replace(/"/g, '""');
      return /[",\n]/.test(cell) ? `"${cell}"` : cell;
    };
    return ['sep=,', headers.join(','), ...rows.map(row => headers.map(h => escapeCell((row as any)[h])).join(','))].join('\n');
  }
  download(filename: string, rows: Record<string, unknown>[]): void {
    const csv = this.toCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }
}
