'use client';

import { ButtonHTMLAttributes, DetailedHTMLProps, FC } from 'react';
import { clsx } from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variantClass: Record<Variant, string> = {
  // B — solid cyan (chosen)
  primary: 'bg-[#38bdf8] text-[#06222e] hover:brightness-110',
  secondary:
    'bg-white/[0.06] border border-white/[0.12] text-newTextColor hover:bg-white/[0.10]',
  ghost:
    'bg-transparent border border-white/[0.12] text-newTextColor/60 hover:text-newTextColor hover:bg-white/[0.05]',
  danger:
    'bg-[rgba(248,113,113,0.14)] border border-[rgba(248,113,113,0.4)] text-[#fca5a5] hover:bg-[rgba(248,113,113,0.22)]',
};

/**
 * Admin-scoped button. Drop-in replacement for the shared <Button> (same props:
 * `secondary`, `loading`, `disabled`, onClick…) so files can `import { AdminButton as Button }`
 * and keep their JSX. Styled to the Postra dark-glass system (solid-cyan primary).
 * NOT used outside /admin — the shared @gitroom/react/form/button stays untouched.
 */
export const AdminButton: FC<
  DetailedHTMLProps<
    ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  > & {
    variant?: Variant;
    secondary?: boolean;
    loading?: boolean;
  }
> = ({ children, variant, secondary, loading, className, ...props }) => {
  const v: Variant = variant ?? (secondary ? 'secondary' : 'primary');
  return (
    <button
      {...props}
      type={props.type || 'button'}
      className={clsx(
        'inline-flex items-center justify-center gap-[7px] rounded-[10px] px-[18px] h-[38px] text-[13.5px] font-[600] cursor-pointer transition-all duration-150 whitespace-nowrap',
        variantClass[v],
        (props.disabled || loading) && 'opacity-40 pointer-events-none',
        className
      )}
    >
      {children}
    </button>
  );
};

/** Shared control styles — rounded glass, accent focus. */
export const adminInput =
  'bg-white/[0.04] h-[38px] border border-white/[0.12] rounded-[10px] px-[12px] text-[14px] text-newTextColor placeholder:text-newTextColor/40 outline-none focus:border-[rgba(56,189,248,0.5)] transition-colors';

export const adminSelect = `${adminInput} cursor-pointer`;

/**
 * Segmented filter pill (Today / 7d / 30d …). Active = cyan tint, NOT solid
 * cyan — solid cyan is reserved for the primary action CTA so the two don't
 * compete. Use for toggle groups, not for buttons that perform an action.
 */
export const adminSegment = (active: boolean) =>
  clsx(
    'h-[32px] px-[14px] rounded-[10px] text-[13px] border cursor-pointer whitespace-nowrap transition-colors',
    active
      ? 'bg-[rgba(56,189,248,0.16)] border-[rgba(56,189,248,0.5)] text-[#7dd3fc] font-[600]'
      : 'bg-white/[0.03] text-newTextColor/70 border-white/10 hover:border-white/25 hover:text-newTextColor'
  );
