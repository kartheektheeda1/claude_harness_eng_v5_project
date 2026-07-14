const auth = (role) => btoa(role === 'admin' ? 'admin:admin123' : 'customer:customer123');
export async function api(path, options = {}, role = 'customer') {
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth(role)}`, ...options.headers } });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status})`);
  return data;
}
