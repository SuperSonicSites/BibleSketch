// The bundle's `ot` button (components/ui/Button in the old source).
import type { ButtonHTMLAttributes } from 'react';

const VARIANTS = {
  primary: 'bg-[#7C3AED] text-white hover:bg-[#6D28D9] focus:ring-[#7C3AED] shadow-lg shadow-purple-200',
  secondary: 'bg-[#FCD34D] text-[#7C3AED] hover:bg-[#FBBF24] focus:ring-[#FCD34D]',
  outline: 'border-2 border-[#7C3AED] text-[#7C3AED] hover:bg-purple-50',
  ghost: 'text-gray-600 hover:bg-gray-100',
};
const SIZES = { sm: 'px-4 py-2 text-sm', md: 'px-6 py-3 text-base', lg: 'px-8 py-4 text-lg' };

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  isLoading?: boolean;
};

export default function Button({ variant = 'primary', size = 'md', className = '', isLoading, disabled, children, ...rest }: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-full font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
}
