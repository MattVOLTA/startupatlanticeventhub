import { useState, useEffect, useCallback } from 'react';
import debounce from 'lodash/debounce';

export function useLocalStorage<T>(key: string, initialValue: T) {
  // Get from local storage then parse stored json or return initialValue
  const readValue = () => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  };

  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Create a debounced version of the localStorage setter
  const debouncedSetItem = useCallback(
    debounce((key: string, value: string) => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, value);
      }
    }, 500),
    []
  );

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Save state immediately
      setStoredValue(valueToStore);
      
      // Debounce the localStorage update
      debouncedSetItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  // Read value from localStorage on mount
  useEffect(() => {
    setStoredValue(readValue());
  }, []);

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedSetItem.cancel();
    };
  }, [debouncedSetItem]);

  return [storedValue, setValue] as const;
}