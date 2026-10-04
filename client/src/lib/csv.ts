// Cells starting with = + - @ are prefixed with ' so spreadsheets don't execute them as formulas.
const cell = (v: unknown) => {
  let s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export function toCsv<T extends Record<string, any>>(rows: T[], columns: [header: string, get: (row: T) => unknown][]) {
  return [columns.map(c => cell(c[0])).join(","), ...rows.map(r => columns.map(c => cell(c[1](r))).join(","))].join("\r\n");
}

export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })); // BOM so Excel reads UTF-8
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

export const registrationsCsv = (rows: any[]) => toCsv(rows, [
  ["ID", r => r.id], ["Program", r => r.programTitle ?? "(general)"], ["First name", r => r.firstName], ["Last name", r => r.lastName], ["Email", r => r.email],
  ["WhatsApp", r => r.normalizedWhatsapp], ["Country", r => r.country], ["Class / level", r => r.classLevel], ["School", r => r.school], ["Status", r => r.status], ["Registered at (UTC)", r => r.createdAt],
]);
