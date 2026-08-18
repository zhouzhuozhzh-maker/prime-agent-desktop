type BrandMarkProps = { size?: number };

export function BrandMark({ size = 30 }: BrandMarkProps) {
  return (
    <svg
      aria-label="Prime Agent mark"
      className="brand-mark"
      height={size}
      viewBox="0 0 32 32"
      width={size}
    >
      <rect fill="currentColor" height="32" rx="7" width="32" />
      <path
        d="M8 8h7.25a4.75 4.75 0 0 1 0 9.5H11v6.25M11 11v3.5h4.1a1.75 1.75 0 0 0 0-3.5H11Zm8.75 4.75 4.5-2.75v5.5l-4.5-2.75Zm-4 3.75 4.75 4.25M20.5 19.5l-4.75 4.25"
        fill="none"
        stroke="#fff"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.65"
      />
    </svg>
  );
}
