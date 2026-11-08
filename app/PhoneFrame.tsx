// iPhone-style frame: navy bezel, dynamic island, status bar, and a scrollable
// screen. Keeps its proportions on laptops and shrinks to fit shorter screens.
export default function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[380px] rounded-[3rem] bg-tc-navy p-2.5 shadow-[0_30px_60px_-15px_rgba(15,29,51,0.45)]">
      <div className="relative h-[min(760px,calc(100vh-6rem))] overflow-hidden rounded-[2.5rem] bg-tc-bg flex flex-col">
        <div
          className="absolute top-2.5 left-1/2 -translate-x-1/2 h-[30px] w-[110px] rounded-full bg-tc-navy z-10"
          aria-hidden
        />
        <div className="flex items-center justify-between px-8 pt-3.5 pb-1 text-[13px] font-semibold text-tc-navy shrink-0">
          <span>9:41</span>
          <span className="flex items-center gap-1.5" aria-hidden>
            <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor">
              <rect x="0" y="7" width="3" height="4" rx="0.8" />
              <rect x="4.5" y="5" width="3" height="6" rx="0.8" />
              <rect x="9" y="2.5" width="3" height="8.5" rx="0.8" />
              <rect x="13.5" y="0" width="3" height="11" rx="0.8" />
            </svg>
            <svg width="26" height="12" viewBox="0 0 26 12" fill="none">
              <rect x="0.5" y="0.5" width="22" height="11" rx="3" stroke="currentColor" opacity="0.4" />
              <rect x="2.5" y="2.5" width="16" height="7" rx="1.5" fill="currentColor" />
              <rect x="23.5" y="4" width="2" height="4" rx="1" fill="currentColor" opacity="0.4" />
            </svg>
          </span>
        </div>
        <div className="flex-1 overflow-y-auto pb-6">{children}</div>
      </div>
    </div>
  );
}
