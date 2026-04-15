/**
 * Download a CSV export from the API with JWT auth.
 * Triggers a browser file download.
 *
 * @param {string} path  e.g. "/api/exports/monthly?groupId=..."
 * @param {string} filename  e.g. "report.csv"
 */
export async function downloadCsv(path, filename) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const token = user?.token;

  const base = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const url = `${base}${path}`;

  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Export failed (${res.status})`);
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
