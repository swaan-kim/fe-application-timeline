export interface ContentDiagnostic {
  severity: 'error' | 'warning';
  file?: string;
  field: string;
  message: string;
}

export function formatDiagnostic(issue: ContentDiagnostic): string {
  return `${issue.file ? `${issue.file} · ` : ''}${issue.field}: ${issue.message}`;
}
