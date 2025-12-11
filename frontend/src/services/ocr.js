import api from './api';

export const ocrService = {
  // Parse resume using backend API
  parseResume: async (file, onProgress) => {
    try {
      // For PDF files, show message
      if (file.type === 'application/pdf') {
        if (onProgress) onProgress(100);
        return {
          name: '',
          email: '',
          phone: '',
          skills: [],
          education: '',
          experience: '',
          rawText: 'PDF uploaded. Backend processing not yet supported for PDFs.',
          isPDF: true,
        };
      }
      
      // For images, send to backend
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
