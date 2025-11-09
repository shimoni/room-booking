'use client';

import { apiFetchClient } from '@/lib/apiFetchClient';
import { Input } from '@repo/shadcn/input';
import { cn } from '@repo/shadcn/lib/utils';
import { useEffect, useRef, useState } from 'react';

interface LocationAutocompleteProps {
  defaultValue?: string;
  onSelect?: (value: string) => void;
}

export default function LocationAutocomplete({
  defaultValue = '',
  onSelect,
}: LocationAutocompleteProps) {
  const [query, setQuery] = useState(defaultValue);
  const [locations, setLocations] = useState<string[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fetch locations on mount
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await apiFetchClient('/rooms/autocomplete/locations');

        if (response.ok) {
          const data = await response.json();
          setLocations(data);
        }
      } catch (error) {
        console.error('Failed to fetch locations:', error);
      }
    };

    fetchLocations();
  }, []);

  // Filter locations based on query
  useEffect(() => {
    if (query.trim() === '') {
      setFilteredLocations(locations);
    } else {
      const filtered = locations.filter((location) =>
        location.toLowerCase().includes(query.toLowerCase()),
      );
      setFilteredLocations(filtered);
    }
    setSelectedIndex(-1);
  }, [query, locations]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (location: string) => {
    setQuery(location);
    setShowDropdown(false);
    onSelect?.(location);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || filteredLocations.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredLocations.length - 1 ? prev + 1 : prev,
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && filteredLocations[selectedIndex]) {
          handleSelect(filteredLocations[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        break;
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        id="location"
        name="location"
        type="text"
        placeholder="e.g., New York, USA"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />

      {showDropdown && filteredLocations.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-auto">
          {filteredLocations.map((location, index) => (
            <button
              key={location}
              type="button"
              className={cn(
                'w-full text-left px-4 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors',
                selectedIndex === index && 'bg-accent text-accent-foreground',
              )}
              onClick={() => handleSelect(location)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              {location}
            </button>
          ))}
        </div>
      )}

      {showDropdown &&
        query.trim() !== '' &&
        filteredLocations.length === 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md p-4 text-sm text-muted-foreground">
            No locations found
          </div>
        )}
    </div>
  );
}
