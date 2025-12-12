import api from './api';

export const ocrService = {
  // Parse resume using backend API
  parseResume: async (file, onProgress) => {
    try {
      // Send both PDFs and images to backend
      if (onProgress) onProgress(20);
      
      const formData = new FormData();
      formData.append('file', file);
      
      if (onProgress) onProgress(40);
      
      const response = await api.post('/parse-resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (onProgress) onProgress(100);
      
      return response.data.data;
      
    } catch (error) {
      console.error('Resume parsing error:', error);
      throw new Error(error.response?.data?.error || 'Failed to process resume. Please try again.');
    }
  },
};

export default ocrService;
