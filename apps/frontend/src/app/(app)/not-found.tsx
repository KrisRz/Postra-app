import Link from 'next/link';

// There was no not-found.tsx anywhere in app/. A `notFound()` or an unmatched
// (app) route now renders this branded card instead of Next.js's bare default.
export default function NotFound() {
  return (
    <div className="min-h-[60vh] w-full flex items-center justify-center p-[24px]">
      <div className="max-w-[440px] w-full rounded-[16px] border border-white/10 bg-[rgba(15,23,42,0.72)] backdrop-blur-xl p-[28px] text-center flex flex-col gap-[14px]">
        <div className="text-[40px]">🔍</div>
        <div className="text-white text-[18px] font-[600]">Page not found</div>
        <div className="text-white/60 text-[14px]">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </div>
        <div className="flex justify-center mt-[6px]">
          <Link
            href="/"
            className="h-[40px] px-[18px] rounded-[8px] bg-[#38bdf8] text-[#0a0e1a] font-[600] text-[14px] flex items-center"
          >
            Back to app
          </Link>
        </div>
      </div>
    </div>
  );
}
