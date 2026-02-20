import Link from "next/link";

type Props = {
  children: React.ReactNode;
};

export function AppShell({ children }: Props) {
  return (
    <div>
      {/* Floating glassmorphism pill navbar */}
      <nav className="fixed top-8 left-1/2 -translate-x-1/2 z-50 px-6">
        <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-full shadow-2xl px-10 py-4">
          <div className="absolute inset-0 rounded-full pointer-events-none" />
          <div className="relative flex items-center justify-center space-x-12">
            <Link
              href="/"
              className="text-white/70 hover:text-white transition-all duration-300 font-medium text-sm"
            >
              Home
            </Link>
            <Link
              href="/trade"
              className="text-white/70 hover:text-white transition-all duration-300 font-medium text-sm"
            >
              Trade
            </Link>
            <Link
              href="/history"
              className="text-white/70 hover:text-white transition-all duration-300 font-medium text-sm"
            >
              History
            </Link>
            <Link
              href="/portfolio"
              className="text-white/70 hover:text-white transition-all duration-300 font-medium text-sm"
            >
              Portfolio
            </Link>
          </div>
        </div>
      </nav>

      {/* Page content */}
      {children}
    </div>
  );
}
