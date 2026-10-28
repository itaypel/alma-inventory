type P = { size?: number };
const base = (size = 20) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
});

export const BoxIcon = ({ size }: P) => (
  <svg {...base(size)}><path d="M3 8l9-5 9 5v8l-9 5-9-5z" /><path d="M3 8l9 5 9-5" /><path d="M12 13v8" /></svg>
);
export const BoxPlusIcon = ({ size }: P) => (
  <svg {...base(size)} strokeWidth={1.8}><path d="M3 8l9-5 9 5v8l-9 5-9-5z" /><path d="M12 9v6" /><path d="M9 12h6" /></svg>
);
export const BoxMinusIcon = ({ size }: P) => (
  <svg {...base(size)} strokeWidth={1.8}><path d="M3 8l9-5 9 5v8l-9 5-9-5z" /><path d="M9 12h6" /></svg>
);
export const ReportIcon = ({ size }: P) => (
  <svg {...base(size)} strokeWidth={1.8}><path d="M6 2h9l5 5v15H6z" /><path d="M14 2v6h6" /><path d="M9 13h8" /><path d="M9 17h5" /></svg>
);
export const DownloadIcon = ({ size }: P) => (
  <svg {...base(size)}><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M4 20h16" /></svg>
);
export const SearchIcon = ({ size }: P) => (
  <svg {...base(size)}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
);
export const CloseIcon = ({ size }: P) => (
  <svg {...base(size)}><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>
);
export const PlusIcon = ({ size }: P) => (
  <svg {...base(size)}><path d="M12 5v14" /><path d="M5 12h14" /></svg>
);
export const LogoutIcon = ({ size }: P) => (
  <svg {...base(size)}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l-5-5 5-5" /><path d="M5 12h12" /></svg>
);
export const CheckIcon = ({ size }: P) => (
  <svg {...base(size)} strokeWidth={2.5}><path d="M5 12l5 5 9-10" /></svg>
);
export const KeyIcon = ({ size }: P) => (
  <svg {...base(size)}><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9" /><path d="M17 6l3 3" /></svg>
);
export const PersonIcon = ({ size }: P) => (
  <svg {...base(size)}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
);
export const PlumbIcon =({ size }: P) => (
  <svg {...base(size)} strokeWidth={1.8}><path d="M4 4h6v5h7a3 3 0 0 1 3 3v3" /><path d="M4 9h6" /><path d="M20 19.5a1.5 1.5 0 0 1-3 0c0-1 1.5-2.5 1.5-2.5s1.5 1.5 1.5 2.5z" /></svg>
);
export const HvacIcon = ({ size }: P) => (
  <svg {...base(size)} strokeWidth={1.8}><path d="M12 2v20" /><path d="M4 7l16 10" /><path d="M20 7L4 17" /><path d="M9 3.5l3 2.5 3-2.5" /><path d="M9 20.5l3-2.5 3 2.5" /></svg>
);
export const BoltIcon = ({ size }: P) => (
  <svg {...base(size)} strokeWidth={1.8}><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>
);

export const CATEGORY_ICON = { 'אינסטלציה': PlumbIcon, 'מיזוג': HvacIcon, 'חשמל': BoltIcon } as const;
