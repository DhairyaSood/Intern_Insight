import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Search } from 'lucide-react';

const SectorInterestsInput = ({ sectors, onChange, availableSectors, placeholder = "Search sectors..." }) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredSectors, setFilteredSectors] = useState(availableSectors);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Filter sectors based on input
    if (inputValue.trim()) {
      const filtered = availableSectors.filter(sector =>
        sector.toLowerCase().includes(inputValue.toLowerCase()) &&
        !sectors.includes(sector)
      );
      setFilteredSectors(filtered);
    } else {
      setFilteredSectors(availableSectors.filter(sector => !sectors.includes(sector)));
    }
  }, [inputValue, sectors, availableSectors]);

  const addSector = (sector) => {
    if (!sectors.includes(sector)) {
      onChange([...sectors, sector]);
      setInputValue('');
      inputRef.current?.focus();
    }
  };

  const removeSector = (sectorToRemove) => {
    onChange(sectors.filter(sector => sector !== sectorToRemove));
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    setIsOpen(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && filteredSectors.length > 0) {
      e.preventDefault();
      addSector(filteredSectors[0]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected sectors display */}
      <div className="mb-3">
        {sectors.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {sectors.map(sector => (
              <span
                key={sector}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 rounded-full text-sm font-medium"
              >
                {sector}
                <button
                  type="button"
                  onClick={() => removeSector(sector)}
                  className="hover:bg-primary-200 dark:hover:bg-primary-800 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="input-field pl-10 pr-10"
        />
        <ChevronDown 
          className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Dropdown */}
      {isOpen && filteredSectors.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-24 overflow-y-auto">
          {filteredSectors.map(sector => (
            <button
              key={sector}
              type="button"
              onClick={() => addSector(sector)}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-colors text-sm"
            >
              {sector}
            </button>
          ))}
        </div>
      )}

      {isOpen && filteredSectors.length === 0 && inputValue && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-4 py-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">No sectors found</p>
        </div>
      )}
    </div>
  );
};

export default SectorInterestsInput;
