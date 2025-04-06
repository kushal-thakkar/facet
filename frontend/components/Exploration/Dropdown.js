import React, { useState, useEffect, useRef } from 'react';

const Dropdown = ({ label, options, value, onChange, icon, enableTypeahead = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);
  const searchInputRef = useRef(null);

  const selectedOption = options.find((option) => option.id === value) || options[0];

  // Filter options based on search term
  const filteredOptions = searchTerm
    ? options.filter((option) => option.label.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;

  // Close dropdown when clicking outside or pressing Escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }

    function handleEscapeKey(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSearchTerm('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [wrapperRef]);

  // Focus on search input when dropdown opens
  useEffect(() => {
    if (isOpen && enableTypeahead && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, enableTypeahead]);

  // Handle dropdown open
  const handleOpen = () => {
    setIsOpen(!isOpen);
    setSearchTerm('');
  };

  return (
    <div className="w-full" ref={wrapperRef}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label}
      </label>

      {/* Dropdown trigger */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2 h-10 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md shadow-sm text-sm hover:border-blue-500 focus:outline-none"
        onClick={handleOpen}
      >
        <div className="flex items-center">
          {icon && <span className="mr-2">{icon}</span>}
          <span className="text-gray-900 dark:text-gray-200">{selectedOption.label}</span>
        </div>
        <svg className="w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-60 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
          {/* Search input for typeahead */}
          {enableTypeahead && (
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search options..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-4 w-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Options list */}
          <div className="py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.id}
                  className={`px-4 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 ${
                    option.id === value
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      : 'text-gray-900 dark:text-gray-200'
                  } truncate`}
                  onClick={() => {
                    onChange(option.id);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  title={option.label}
                >
                  {option.label}
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dropdown;
