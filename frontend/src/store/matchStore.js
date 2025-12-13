import { create } from 'zustand';
import { internshipService } from '../services/internships';
import { getCompanyById } from '../services/companies';

const normalizeId = (id) => {
  if (id === null || id === undefined) return null;
  const s = String(id);
  return s.length ? s : null;
};

// In-flight de-dupe so repeated refreshes for the same id don't spam requests.
const inFlightInternship = new Map();
const inFlightCompany = new Map();

export const useMatchStore = create((set, get) => ({
  internshipMatchById: {},
  internshipMatchUpdatedAt: {},
  companyMatchById: {},
  companyMatchUpdatedAt: {},

  setInternshipMatch: (internshipId, matchScore) => {
    const id = normalizeId(internshipId);
    if (!id) return;
    const score = Number.isFinite(Number(matchScore)) ? Number(matchScore) : 0;
    set((state) => ({
      internshipMatchById: { ...state.internshipMatchById, [id]: score },
      internshipMatchUpdatedAt: { ...state.internshipMatchUpdatedAt, [id]: Date.now() },
    }));
  },

  setCompanyMatch: (companyId, matchScore) => {
    const id = normalizeId(companyId);
    if (!id) return;
    const score = Number.isFinite(Number(matchScore)) ? Number(matchScore) : 0;
    set((state) => ({
      companyMatchById: { ...state.companyMatchById, [id]: score },
      companyMatchUpdatedAt: { ...state.companyMatchUpdatedAt, [id]: Date.now() },
    }));
  },

  primeInternshipMatches: (items) => {
    if (!Array.isArray(items) || items.length === 0) return;
    set((state) => {
      const nextMap = { ...state.internshipMatchById };
      const nextTs = { ...state.internshipMatchUpdatedAt };
      for (const it of items) {
        const id = normalizeId(it?.internship_id ?? it?._id ?? it?.id);
        if (!id) continue;
        const raw = it?.match_score ?? it?.matchScore ?? it?.score;
        if (raw === undefined || raw === null) continue;
        const score = Number.isFinite(Number(raw)) ? Number(raw) : 0;
        nextMap[id] = score;
        nextTs[id] = Date.now();
      }
      return { internshipMatchById: nextMap, internshipMatchUpdatedAt: nextTs };
    });
  },

  primeCompanyMatches: (items) => {
    if (!Array.isArray(items) || items.length === 0) return;
    set((state) => {
      const nextMap = { ...state.companyMatchById };
      const nextTs = { ...state.companyMatchUpdatedAt };
      for (const it of items) {
        const id = normalizeId(it?.company_id ?? it?._id ?? it?.id);
        if (!id) continue;
        const raw = it?.match_score ?? it?.matchScore ?? it?.score;
        if (raw === undefined || raw === null) continue;
        const score = Number.isFinite(Number(raw)) ? Number(raw) : 0;
        nextMap[id] = score;
        nextTs[id] = Date.now();
      }
      return { companyMatchById: nextMap, companyMatchUpdatedAt: nextTs };
    });
  },

  refreshInternshipMatch: async (candidateId, internshipId) => {
    const cid = normalizeId(candidateId);
    const iid = normalizeId(internshipId);
    if (!cid || !iid) return null;

    const key = `${cid}:${iid}`;
    const existing = inFlightInternship.get(key);
    if (existing) return existing;

    const p = (async () => {
      try {
        const res = await internshipService.getInternshipMatch(cid, iid);
        const score = res?.match_score ?? 0;
        get().setInternshipMatch(iid, score);
        return score;
      } catch {
        return null;
      } finally {
        inFlightInternship.delete(key);
      }
    })();

    inFlightInternship.set(key, p);
    return p;
  },

  refreshInternshipMatches: async (candidateId, internshipIds) => {
    const cid = normalizeId(candidateId);
    if (!cid) return;
    const ids = Array.from(new Set((internshipIds || []).map(normalizeId).filter(Boolean)));
    if (ids.length === 0) return;
    await Promise.allSettled(ids.map((iid) => get().refreshInternshipMatch(cid, iid)));
  },

  refreshCompanyMatch: async (companyId) => {
    const cid = normalizeId(companyId);
    if (!cid) return null;

    const existing = inFlightCompany.get(cid);
    if (existing) return existing;

    const p = (async () => {
      try {
        const res = await getCompanyById(cid);
        const payload = res?.data?.data ?? res?.data ?? {};
        const score = payload?.match_score ?? 0;
        get().setCompanyMatch(cid, score);
        return score;
      } catch {
        return null;
      } finally {
        inFlightCompany.delete(cid);
      }
    })();

    inFlightCompany.set(cid, p);
    return p;
  },

  refreshCompanyMatches: async (companyIds) => {
    const ids = Array.from(new Set((companyIds || []).map(normalizeId).filter(Boolean)));
    if (ids.length === 0) return;
    await Promise.allSettled(ids.map((cid) => get().refreshCompanyMatch(cid)));
  },
}));
