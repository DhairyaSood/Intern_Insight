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
        <div className="card text-center py-12">
          {/* Elegant Spinning Loader */}
          <div className="relative inline-flex items-center justify-center mb-8">
            {/* Outer rotating ring */}
            <div className="absolute w-32 h-32 rounded-full border-4 border-primary-200 dark:border-primary-900/40"></div>
            
            {/* Animated gradient ring */}
            <div className="absolute w-32 h-32 rounded-full border-4 border-transparent border-t-primary-600 dark:border-t-primary-400 animate-spin"></div>
            
            {/* Inner pulsing circle */}
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 dark:from-primary-600 dark:to-primary-800 flex items-center justify-center shadow-xl animate-pulse">
              <FileText className="h-10 w-10 text-white" />
            </div>
            
            {/* Percentage badge */}
            <div className="absolute -bottom-2 bg-white dark:bg-gray-800 px-4 py-1 rounded-full shadow-lg border-2 border-primary-500 dark:border-primary-400">
              <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                {progress}%
              </span>
            </div>
          </div>

          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Processing Your Resume
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Extracting your information...
          </p>

          {/* Progress bar */}
          <div className="max-w-md mx-auto">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary-500 via-primary-600 to-primary-500 h-2 rounded-full transition-all duration-500 ease-out shadow-lg bg-[length:200%_100%] animate-shimmer"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Status indicator */}
          <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            {progress < 30 && (
              <span className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
                Uploading file...
              </span>
            )}
            {progress >= 30 && progress < 70 && (
              <span className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
                Extracting text...
              </span>
            )}
            {progress >= 70 && (
              <span className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
                Parsing information...
              </span>
            )}
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
