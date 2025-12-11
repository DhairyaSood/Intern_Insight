import React, { useState, useRef } from 'react';
import { X } from 'lucide-react';

const SkillsInput = ({ skills, onChange, placeholder = "Add skills..." }) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  // Common skills suggestions
  const commonSkills = [
    'Python', 'JavaScript', 'React', 'Node.js', 'Java', 'C++',
    'Data Analysis', 'Machine Learning', 'SQL', 'MongoDB',
    'HTML/CSS', 'TypeScript', 'Django', 'Flask', 'Express',
    'AWS', 'Docker', 'Git', 'REST APIs', 'UI/UX Design',
    'Content Writing', 'Digital Marketing', 'SEO', 'Social Media',
    'Excel', 'PowerPoint', 'Project Management', 'Communication'
  ];

  const [suggestions, setSuggestions] = useState([]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);

    // Filter suggestions
    if (value.trim()) {
      const filtered = commonSkills.filter(
        skill => 
          skill.toLowerCase().includes(value.toLowerCase()) &&
          !skills.includes(skill)
      );
      setSuggestions(filtered.slice(0, 8));
    } else {
      setSuggestions([]);
    }
  };

  const addSkill = (skill) => {
    if (skill.trim() && !skills.includes(skill.trim())) {
      onChange([...skills, skill.trim()]);
      setInputValue('');
      setSuggestions([]);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addSkill(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && skills.length > 0) {
      // Remove last skill when backspace on empty input
      onChange(skills.slice(0, -1));
    }
  };

  const removeSkill = (skillToRemove) => {
    onChange(skills.filter(skill => skill !== skillToRemove));
  };

  return (
    <div className="relative">
      {/* Skills display */}
      <div className="input-field min-h-[100px] p-2 flex flex-wrap gap-2 items-start">
        {skills.map((skill, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 rounded-full text-sm"
          >
            {skill}
            <button
              type="button"
              onClick={() => removeSkill(skill)}
              className="hover:bg-primary-200 dark:hover:bg-primary-800 rounded-full p-0.5 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={skills.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
        />
      </div>

      {/* Suggestions dropdown */}
      {suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((skill, index) => (
            <button
              key={index}
              type="button"
              onClick={() => addSkill(skill)}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
            >
              {skill}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Press Enter or comma to add. Click × to remove.
      </p>
    </div>
  );
};

export default SkillsInput;
