'use client';

import { useState, useEffect } from 'react';
import { DEFAULT_LENDERS } from '@finapp/core';

interface LenderSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

/**
 * Lender select with common options and custom input
 */
export function LenderSelect({
  value,
  onChange,
  disabled = false,
  error,
}: LenderSelectProps): React.JSX.Element {
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const allLenders: string[] = [...DEFAULT_LENDERS.banks, ...DEFAULT_LENDERS.leasing];

  useEffect(() => {
    const isInList = allLenders.includes(value);
    if (!isInList && value) {
      setIsCustom(true);
      setCustomValue(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    if (newValue === '__custom__') {
      setIsCustom(true);
      setCustomValue('');
      onChange('');
    } else {
      setIsCustom(false);
      onChange(newValue);
    }
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setCustomValue(newValue);
    onChange(newValue);
  };

  return (
    <div className="space-y-2">
      <label htmlFor="lender" className="text-sm font-medium">
        Veriteľ *
      </label>
      
      {!isCustom ? (
        <select
          id="lender"
          value={value}
          onChange={handleSelectChange}
          disabled={disabled}
          required
          className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
            error ? 'border-destructive' : 'border-input'
          }`}
        >
          <option value="">Vyberte veriteľa...</option>
          
          <optgroup label="Banky">
            {DEFAULT_LENDERS.banks.map((lender) => (
              <option key={lender} value={lender}>
                {lender}
              </option>
            ))}
          </optgroup>
          
          <optgroup label="Leasingové spoločnosti">
            {DEFAULT_LENDERS.leasing.map((lender) => (
              <option key={lender} value={lender}>
                {lender}
              </option>
            ))}
          </optgroup>
          
          <option value="__custom__">➕ Vlastný veriteľ...</option>
        </select>
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            value={customValue}
            onChange={handleCustomChange}
            placeholder="Zadajte názov veriteľa"
            disabled={disabled}
            required
            className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
              error ? 'border-destructive' : 'border-input'
            }`}
          />
          <button
            type="button"
            onClick={() => {
              setIsCustom(false);
              setCustomValue('');
              onChange('');
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← Vrátiť sa na zoznam
          </button>
        </div>
      )}
      
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

