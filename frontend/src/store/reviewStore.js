import { create } from 'zustand';
import { reviewService } from '../services/reviews';

const normalizeId = (id) => {
  if (id === null || id === undefined) return null;
  const s = String(id);
  return s.length ? s : null;
};

const DEFAULT_TTL_MS = 30_000;

const upsertReviewInList = (list, updated) => {
  if (!updated) return list;
  const uid = normalizeId(updated._id ?? updated.id);
  if (!uid) return list;
  const idx = list.findIndex((r) => normalizeId(r?._id ?? r?.id) === uid);
  if (idx < 0) return list;
  const next = list.slice();
  next[idx] = { ...next[idx], ...updated };
  return next;
};

const removeReviewFromList = (list, reviewId) => {
  const rid = normalizeId(reviewId);
  if (!rid) return list;
  return list.filter((r) => normalizeId(r?._id ?? r?.id) !== rid);
};

export const useReviewStore = create((set, get) => ({
  companyById: {},
  internshipById: {},

  ensureCompanyReviews: async (companyId, { force = false, ttlMs = DEFAULT_TTL_MS, limit = 50 } = {}) => {
    const cid = normalizeId(companyId);
    if (!cid) return;

    const existing = get().companyById[cid];
    const fresh = existing?.fetchedAt && (Date.now() - existing.fetchedAt) < ttlMs;
    if (!force && fresh && Array.isArray(existing?.reviews)) return;

    set((state) => ({
      companyById: {
        ...state.companyById,
        [cid]: { ...(state.companyById[cid] || {}), loading: true, error: null },
      },
    }));

    try {
      const res = await reviewService.company.getAll(cid, { limit, offset: 0, sort_by: 'recent' });
      const reviews = res?.reviews || [];
      set((state) => ({
        companyById: {
          ...state.companyById,
          [cid]: { reviews, loading: false, error: null, fetchedAt: Date.now() },
        },
      }));
    } catch (e) {
      set((state) => ({
        companyById: {
          ...state.companyById,
          [cid]: { ...(state.companyById[cid] || {}), loading: false, error: 'Failed to load reviews', fetchedAt: Date.now() },
        },
      }));
    }
  },

  ensureInternshipReviews: async (internshipId, { force = false, ttlMs = DEFAULT_TTL_MS, limit = 50 } = {}) => {
    const iid = normalizeId(internshipId);
    if (!iid) return;

    const existing = get().internshipById[iid];
    const fresh = existing?.fetchedAt && (Date.now() - existing.fetchedAt) < ttlMs;
    if (!force && fresh && Array.isArray(existing?.reviews)) return;

    set((state) => ({
      internshipById: {
        ...state.internshipById,
        [iid]: { ...(state.internshipById[iid] || {}), loading: true, error: null },
      },
    }));

    try {
      const res = await reviewService.internship.getAll(iid, { limit, offset: 0, sort_by: 'recent' });
      const reviews = res?.reviews || [];
      set((state) => ({
        internshipById: {
          ...state.internshipById,
          [iid]: { reviews, loading: false, error: null, fetchedAt: Date.now() },
        },
      }));
    } catch (e) {
      set((state) => ({
        internshipById: {
          ...state.internshipById,
          [iid]: { ...(state.internshipById[iid] || {}), loading: false, error: 'Failed to load reviews', fetchedAt: Date.now() },
        },
      }));
    }
  },

  markHelpful: async (reviewId) => {
    const rid = normalizeId(reviewId);
    if (!rid) return;

    try {
      const res = await reviewService.markHelpful(rid);
      const updated = res?.review || res?.updated_review || res;

      set((state) => {
        const nextCompany = { ...state.companyById };
        for (const key of Object.keys(nextCompany)) {
          const entry = nextCompany[key];
          if (!entry?.reviews) continue;
          nextCompany[key] = { ...entry, reviews: upsertReviewInList(entry.reviews, updated) };
        }

        const nextInternship = { ...state.internshipById };
        for (const key of Object.keys(nextInternship)) {
          const entry = nextInternship[key];
          if (!entry?.reviews) continue;
          nextInternship[key] = { ...entry, reviews: upsertReviewInList(entry.reviews, updated) };
        }

        return { companyById: nextCompany, internshipById: nextInternship };
      });
    } catch {
      // ignore
    }
  },

  deleteReview: async (reviewId) => {
    const rid = normalizeId(reviewId);
    if (!rid) return;

    try {
      await reviewService.delete(rid);
      set((state) => {
        const nextCompany = { ...state.companyById };
        for (const key of Object.keys(nextCompany)) {
          const entry = nextCompany[key];
          if (!entry?.reviews) continue;
          nextCompany[key] = { ...entry, reviews: removeReviewFromList(entry.reviews, rid) };
        }

        const nextInternship = { ...state.internshipById };
        for (const key of Object.keys(nextInternship)) {
          const entry = nextInternship[key];
          if (!entry?.reviews) continue;
          nextInternship[key] = { ...entry, reviews: removeReviewFromList(entry.reviews, rid) };
        }

        return { companyById: nextCompany, internshipById: nextInternship };
      });
    } catch {
      // ignore
    }
  },
}));
