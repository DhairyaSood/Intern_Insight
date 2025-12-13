import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ThumbsUp, ThumbsDown } from 'lucide-react';

const InteractionReasonModal = ({ 
  isOpen, 
  onClose, 
  interactionType, // 'like' or 'dislike'
  entityType, // 'company' or 'internship'
  entityName,
  onSubmit 
}) => {
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const companyReasons = {
    like: [
      'Great company culture',
      'Excellent benefits',
      'Good work-life balance',
      'Strong reputation',
      'Innovation focused',
      'Learning opportunities',
      'Career growth potential',
      'Good management'
    ],
    dislike: [
      'Poor work culture',
      'Inadequate benefits',
      'Bad work-life balance',
      'Negative reviews',
      'Limited growth',
      'Poor management',
      'Low compensation',
      'Toxic environment'
    ]
  };

  const internshipReasons = {
    like: [
      'Perfect role fit',
      'Skills match well',
      'Great location',
      'Good stipend',
      'Learning opportunity',
      'Reputable company',
      'Interesting projects',
      'Career relevant'
    ],
    dislike: [
      'Role doesn\'t fit',
      'Skills mismatch',
      'Poor location',
      'Low stipend',
      'Limited learning',
      'Not interested in sector',
      'Too advanced/basic',
      'Duration issues'
    ]
  };

  const reasons = entityType === 'company' 
    ? companyReasons[interactionType] 
    : internshipReasons[interactionType];

  const handleReasonToggle = (reason) => {
    setSelectedReasons(prev => 
      prev.includes(reason) 
        ? prev.filter(r => r !== reason)
        : [...prev, reason]
    );
  };

  const handleSubmit = async () => {
    if (selectedReasons.length === 0 && !customReason.trim()) {
      alert('Please select at least one reason or provide a custom reason');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        reason_tags: selectedReasons,
        reason_text: customReason.trim()
      });
      // Reset state
      setSelectedReasons([]);
      setCustomReason('');
      onClose();
    } catch (error) {
      console.error('Failed to submit interaction:', error);
      alert('Failed to save your feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReasons([]);
    setCustomReason('');
    onClose();
  };

  if (!isOpen) return null;

  const Icon = interactionType === 'like' ? ThumbsUp : ThumbsDown;
  const color = interactionType === 'like' ? 'green' : 'red';

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
      onClick={(e) => {
        // Only close if clicking the backdrop, not the modal content
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900/20`}>
              <Icon className={`h-6 w-6 text-${color}-600 dark:text-${color}-400`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Why {interactionType === 'like' ? 'do you like' : 'don\'t you like'} this?
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {entityName}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Helper Text */}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {entityType === 'company' ? (
              <>
                <strong className="text-primary-600 dark:text-primary-400">Your feedback helps everyone!</strong> 
                {' '}Company interactions improve recommendations for all users.
              </>
            ) : (
              <>
                <strong className="text-primary-600 dark:text-primary-400">Personalize your experience!</strong>
                {' '}This helps us recommend better internships for you.
              </>
            )}
          </p>

          {/* Reason Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Select reasons (choose all that apply)
            </label>
            <div className="flex flex-wrap gap-2">
              {reasons.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => handleReasonToggle(reason)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedReasons.includes(reason)
                      ? `bg-${color}-100 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-300 ring-2 ring-${color}-500`
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Additional comments (optional)
            </label>
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Tell us more about your decision..."
              rows={3}
              className="input-field resize-none"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {customReason.length}/500 characters
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            className="flex-1 btn-secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (selectedReasons.length === 0 && !customReason.trim())}
            className={`flex-1 btn-primary ${
              isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default InteractionReasonModal;
