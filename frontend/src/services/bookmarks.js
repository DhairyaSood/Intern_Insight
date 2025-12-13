import api from './api';

export const bookmarkService = {
  list: async () => {
    const res = await api.get('/bookmarks');
    // success_response wraps payload as { data: {...} }
    return res.data?.data ?? res.data;
  },
  add: async (internshipId) => {
    const res = await api.post(`/bookmarks/${encodeURIComponent(internshipId)}`);
    return res.data?.data ?? res.data;
  },
  remove: async (internshipId) => {
    const res = await api.delete(`/bookmarks/${encodeURIComponent(internshipId)}`);
    return res.data?.data ?? res.data;
  },
};
