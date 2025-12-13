import { create } from 'zustand';
import { profileService } from '../services/profile';

const isValidObjectIdString = (value) => {
  const s = String(value ?? '').trim();
  if (!s) return false;
  if (s === 'undefined' || s === 'null') return false;
  if (s.startsWith('CAND_')) return false;
  return /^[a-f\d]{24}$/i.test(s);
};

export const useIdentityStore = create((set, get) => ({
  username: null,
  candidateId: null,
  resolving: false,

  syncFromAuth: (user) => {
    const username = (user?.username || '').trim() || null;
    const current = get();

    if (!username) {
      if (current.username !== null || current.candidateId !== null || current.resolving) {
        set({ username: null, candidateId: null, resolving: false });
      }
      return null;
    }

    // If user changed, reset derived state.
    if (current.username !== username) {
      set({ username, candidateId: null, resolving: false });
    }

    const rawCandidateId = user?.candidate_id;
    if (isValidObjectIdString(rawCandidateId)) {
      const cid = String(rawCandidateId).trim();
      if (get().candidateId !== cid) set({ candidateId: cid });
      return cid;
    }

    return get().candidateId;
  },

  ensureResolved: async (user) => {
    const username = (user?.username || '').trim() || null;
    if (!username) {
      get().syncFromAuth(user);
      return null;
    }

    const existing = get().syncFromAuth(user);
    if (existing) return existing;

    if (get().resolving) return get().candidateId;

    set({ resolving: true, username });
    try {
      const profile = await profileService.getByUsername(username);
      const cid = isValidObjectIdString(profile?.candidate_id) ? String(profile.candidate_id).trim() : null;
      if (cid) set({ candidateId: cid });
      return cid;
    } catch {
      return null;
    } finally {
      set({ resolving: false });
    }
  },
}));
