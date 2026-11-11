import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const PasswordInput = forwardRef(function PasswordInput(
  { className = '', autoComplete = 'current-password', ...props },
  ref
) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        ref={ref}
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        className={`input pr-10 ${className}`}
        {...props}
      />
      <button
        type="button"
        aria-label={show ? 'Hide password' : 'Show password'}
        title={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-slate-400 transition hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
});

export default PasswordInput;
