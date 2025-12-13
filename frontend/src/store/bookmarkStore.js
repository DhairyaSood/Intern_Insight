import { create } from 'zustand';
import { bookmarkService } from '../services/bookmarks';

const normalizeId = (id) => {
  if (id === null || id === undefined) return null;
  const s = String(id).trim();
  return s.length ? s : null;
};

export const useBookmarkStore = create((set, get) => ({
  byId: {},
  loadedFor: null,
  loading: false,

  clear: () => set({ byId: {}, loadedFor: null, loading: false }),

  ensureLoaded: async (username, isAuthenticated) => {
    const u = (username || '').trim() || null;
    if (!isAuthenticated || !u) {
      get().clear();
      return;
    }

    if (get().loadedFor === u) return;
    if (get().loading) return;

    set({ loading: true, loadedFor: u });
    try {
      const payload = await bookmarkService.list();
      const ids = Array.isArray(payload?.bookmarks) ? payload.bookmarks : [];
      const next = {};
      for (const raw of ids) {
        const id = normalizeId(raw);
        if (id) next[id] = true;
      }
      set({ byId: next });
    } catch {
      // If request fails (e.g., token expired), keep empty; api interceptor handles redirect.
      set({ byId: {} });
    } finally {
      set({ loading: false });
    }
  },

  isBookmarked: (internshipId) => {
    const id = normalizeId(internshipId);
    if (!id) return false;
    return !!get().byId[id];
  },

  add: async (internshipId) => {
    const id = normalizeId(internshipId);
    if (!id) return;

    // Optimistic.
    set((s) => ({ byId: { ...s.byId, [id]: true } }));
    try {
      await bookmarkService.add(id);
    } catch {
      // Revert on failure.
      set((s) => {
        const next = { ...s.byId };
        delete next[id];
        return { byId: next };
      });
    }
  },

  remove: async (internshipId) => {
    const id = normalizeId(internshipId);
    if (!id) return;

    // Optimistic.
    set((s) => {
      const next = { ...s.byId };
      delete next[id];
      return { byId: next };
    });
    try {
      await bookmarkService.remove(id);
    } catch {
      // Revert on failure.
      set((s) => ({ byId: { ...s.byId, [id]: true } }));
    }
  },

  toggle: async (internshipId) => {
    const id = normalizeId(internshipId);
    if (!id) return;
    if (get().isBookmarked(id)) return get().remove(id);
    return get().add(id);
  },

  getIds: () => Object.keys(get().byId),
}));
