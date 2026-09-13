import { useCallback, useEffect, useRef, useState } from "react";
import { isUnauthorized, registrationsApi } from "../services/dashboardApi.js";

const CACHE_KEY = 'alpha-admin-directory-v1';
const EMPTY_SUMMARY = { total: 0, panelTotal: 0, hackathonTotal: 0, students: 0 };
function readCache(owner) {
  try {
    const value = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (value?.owner === owner && value.entries && typeof value.entries === 'object') return value.entries;
  } catch { /* Storage unavailable or corrupt. */ }
  return {};
}
export function clearAdminCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch { /* Storage unavailable. */ }
}
export function useDashboardData(routeId, onUnauthorized, owner) {
  const [entries, setEntries] = useState(() => readCache(owner));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const pending = useRef(false);
  useEffect(() => {
    generation.current += 1;
    pending.current = false;
    setLoading(false);
    setError('');
    return () => { generation.current += 1; };
  }, [routeId]);
  useEffect(() => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ owner, entries })); } catch { /* Storage full or unavailable. */ }
  }, [entries, owner]);

  const refresh = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    const version = generation.current;
    setLoading(true);
    setError('');
    try {
      const data = routeId === 'overview' ? await registrationsApi.summary()
        : ['checked-in','judges-allocation'].includes(routeId) ? await registrationsApi.report(routeId)
        : await registrationsApi.list(routeId);
      if (version !== generation.current) return;
      setEntries(current => ({ ...current, [routeId]: { ...data, syncedAt: new Date().toISOString() } }));
    } catch (err) {
      if (version !== generation.current) return;
      if (isUnauthorized(err)) { clearAdminCache(); onUnauthorized(); }
      else setError(err.message);
    } finally {
      if (version === generation.current) { pending.current = false; setLoading(false); }
    }
  }, [routeId, onUnauthorized]);

  const removeRegistration = useCallback(async (type, registration) => {
    await registrationsApi.remove(type, registration.id, registration.record_type);
    setEntries(current => ({ ...current, overview: null, [type]: {
      ...current[type], registrations: (current[type]?.registrations || []).filter(item =>
        !(item.id === registration.id && item.record_type === registration.record_type)),
    } }));
  }, []);
  const updateRegistration = useCallback(async (type, registration, payload) => {
    const { registration: updated } = await registrationsApi.update(type, registration.id, registration.record_type, payload);
    // Keep only directory fields in persistent storage, never the full roster.
    setEntries(current => ({ ...current, overview: null, [type]: {
      ...current[type], registrations: (current[type]?.registrations || []).map(item => {
        if (item.id !== registration.id || item.record_type !== registration.record_type) return item;
        const compact = Object.fromEntries(Object.keys(item).map(key => [key, updated[key] ?? item[key]]));
        if (type === 'hackathon' && updated.members) compact.captain_name =
          (updated.members.find(member => member.role === 'Captain') || updated.members[0])?.full_name || '';
        return compact;
      }),
    } }));
    return updated;
  }, []);
  const entry = entries[routeId];
  return { registrations: Array.isArray(entry?.registrations) ? entry.registrations : [],
    summary: entries.overview?.summary || EMPTY_SUMMARY, recent: entries.overview?.recent || [],
    rows: Array.isArray(entry?.rows) ? entry.rows : [],
    syncedAt: entry?.syncedAt, loading, error, setError, refresh, removeRegistration, updateRegistration };
}
