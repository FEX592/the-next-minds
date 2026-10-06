import { useState } from 'react';
import { isValidEmail } from './utils/emailValidation';
import type { RecipientField } from './types/mail';

interface RecipientInputProps {
  field: RecipientField;
  values: string[];
  onChange: (values: string[]) => void;
}

export function RecipientInput({ field, values, onChange }: RecipientInputProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const addValue = (raw: string) => {
    const candidate = raw.trim().replace(/,$/, '');
    if (!candidate) return;
    if (!isValidEmail(candidate)) {
      setError('Enter a valid email address');
      return;
    }
    if (!values.includes(candidate)) onChange([...values, candidate]);
    setInput('');
    setError('');
  };

  return (
    <div className={`recipient-field ${error ? 'has-error' : ''}`}>
      <span className="field-label">{field === 'to' ? 'To' : field.toUpperCase()}</span>
      <div className="recipient-chips">
        {values.map((value) => (
          <span className="recipient-chip" key={value}>
            {value}
            <button type="button" aria-label={`Remove ${value}`} onClick={() => onChange(values.filter((item) => item !== value))}>×</button>
          </span>
        ))}
        <input
          aria-label={`${field} recipients`}
          value={input}
          onChange={(event) => { setInput(event.target.value); setError(''); }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',' || (event.key === 'Tab' && input.trim())) {
              event.preventDefault();
              addValue(input);
            }
            if (event.key === 'Backspace' && !input && values.length) onChange(values.slice(0, -1));
          }}
          onBlur={() => input.trim() && addValue(input)}
          placeholder={values.length ? 'Add another' : 'name@company.com'}
        />
      </div>
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
