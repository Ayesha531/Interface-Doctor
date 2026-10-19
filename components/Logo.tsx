export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lift"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" role="img" aria-label="">
          <path
            d="M3 12h4l2.5-6 4 12 2.5-6h5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-[15px] font-bold tracking-tight text-white">
            Interface Doctor <span className="text-brand-300">AI</span>
          </span>
          <span className="block text-[11px] font-medium uppercase tracking-widest text-ink-400">
            by Team DebugMD
          </span>
        </span>
      )}
    </div>
  );
}
