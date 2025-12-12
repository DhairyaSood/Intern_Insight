import React, { useState, useCallback } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { ocrService } from '../../services/ocr';
import LoadingSpinner from '../Common/LoadingSpinner';

const ResumeUpload = ({ onDataExtracted }) => {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (selectedFile) => {
    if (!selectedFile) return;

    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Please upload a PDF or image file (JPG, PNG)');
      return;
    }

    // Validate file size (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size should be less than 5MB');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setIsProcessing(true);
    setProgress(0);

    try {
      const data = await ocrService.parseResume(selectedFile, (progressPercent) => {
        setProgress(progressPercent);
      });

      // Call parent callback with extracted data
      if (onDataExtracted) {
        onDataExtracted(data);
      }

      setIsProcessing(false);
      setProgress(100);
      
      // Show info message if PDF
      if (data.isPDF) {
        setError('PDF uploaded successfully. Please fill in your details manually below.');
      }
    } catch (err) {
      console.error('OCR Error:', err);
      setError(err.message || 'Failed to process resume. Please try again or fill the form manually.');
      setIsProcessing(false);
      setFile(null);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  }, []);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const clearFile = () => {
    setFile(null);
    setProgress(0);
    setError(null);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {!file && !isProcessing && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer
            ${isDragging 
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
              : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500'
            }
          `}
        >
          <input
            type="file"
            id="resume-upload"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            className="hidden"
          />
          <label htmlFor="resume-upload" className="cursor-pointer block">
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
              Upload your resume
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Drag and drop or click to browse
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Supported formats: PDF, JPG, PNG (max 5MB)
            </p>
          </label>
        </div>
      )}

      {/* Processing State */}
      {isProcessing && (
        <div className="card text-center">
          <div className="relative">
            <LoadingSpinner size="xl" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {progress}%
              </span>
            </div>
          </div>
          <p className="text-gray-900 dark:text-gray-100 font-semibold text-lg mt-6">
            Processing your resume...
          </p>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${
                progress >= 20 ? 'bg-green-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'
              }`} />
              <span className={progress >= 20 ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>
                Uploading file
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${
                progress >= 50 ? 'bg-green-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'
              }`} />
              <span className={progress >= 50 ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>
                Extracting text
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${
                progress >= 80 ? 'bg-green-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'
              }`} />
              <span className={progress >= 80 ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>
                Parsing information
              </span>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mt-6 overflow-hidden">
            <div
              className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-500 ease-out shadow-lg"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* File Uploaded Successfully */}
      {file && !isProcessing && progress === 100 && (
        <div className="card bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              <div>
                <p className="font-medium text-green-900 dark:text-green-100">
                  Resume processed successfully!
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  {file.name}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Information has been extracted and filled in the form below.
                </p>
              </div>
            </div>
            <button
              onClick={clearFile}
              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-red-900 dark:text-red-100">
                Upload failed
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {error}
              </p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeUpload;
