import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";

export default function Home() {
  return (
    <AppShell>
      {/* Hero Section with Wave Background */}
      <section className="hero-section flex flex-col items-center justify-center p-8 min-h-screen">
        <div className="flex flex-col items-start justify-center w-full md:ml-[20%] ml-[5%] space-y-6">
          <div>
            <p className="mb-5">
              <span className="inline-flex items-center px-2 py-1 text-[0.65rem] tracking-[0.35em] uppercase text-white/80 bg-white/10 rounded-full border border-white/20">
                Pulse · Private Prediction Rounds
              </span>
            </p>
            <h1 className="md:text-5xl text-3xl font-sans font-thin uppercase text-left mb-4 inline-block">
              <span className="bg-orange-400 px-2 rounded-md text-black shadow-md">
                Pulse
              </span>
            </h1>
            <p className="md:text-xl text-sm text-left mt-2 max-w-2xl text-white/80">
              Aleo Flash Markets reimagined. Trade private 30-second BTC signal rounds
              with sealed in-round orderflow, trust-minimized settlement, and clean signal visibility after resolution.
              Powered by Aleo&apos;s zero-knowledge proofs.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/trade"
                className="inline-flex items-center px-4 py-2 bg-[#75bfcf] text-black rounded-md font-medium hover:bg-[#75bfcf]/80 transition-colors"
              >
                Enter Betting Area
              </Link>
              <Link
                href="/history"
                className="inline-flex items-center px-4 py-2 border border-white/30 text-white rounded-md font-medium hover:bg-white/10 transition-colors"
              >
                View Round History
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/portfolio"
                className="inline-flex items-center px-4 py-2 border border-white/30 text-white rounded-md font-medium hover:bg-white/10 transition-colors"
              >
                Portfolio
              </Link>
              <span className="group relative text-black inline-flex items-center px-2 py-1 bg-[#75bfcf] dark:bg-[#75bfcf] md:text-sm text-xs rounded-md shadow">
                Powered by Aleo Zero-Knowledge Proofs
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section flex flex-col items-center p-8 min-h-screen">
        <div className="flex flex-col items-start mt-[10%] w-full ml-[5%] md:ml-[20%]">
          <h2 className="text-3xl font-sans font-thin uppercase text-left mb-8 inline-block">
            <span className="bg-orange-400 px-2 text-black">
              Why This Is Different
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
            <div className="backdrop-blur-md bg-white/10 border border-white/25 rounded-2xl shadow-2xl p-6 transition-all duration-300 hover:bg-white/20 hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]">
              <h3 className="text-xl font-bold mb-3">
                <span className="bg-[#75bfcf] px-2 text-black">Sealed Betting</span>
              </h3>
              <p className="text-white/80 leading-relaxed">
                While a round is active, all bets are sealed using Aleo&apos;s zero-knowledge proofs.
                No one can see the aggregate orderflow until the round resolves.
              </p>
            </div>
            <div className="backdrop-blur-md bg-white/10 border border-white/25 rounded-2xl shadow-2xl p-6 transition-all duration-300 hover:bg-white/20 hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]">
              <h3 className="text-xl font-bold mb-3">
                <span className="bg-[#75bfcf] px-2 text-black">On-Chain Lifecycle</span>
              </h3>
              <p className="text-white/80 leading-relaxed">
                Every round goes through a complete on-chain lifecycle: create, close, and resolve.
                All state transitions happen transparently on Aleo&apos;s blockchain.
              </p>
            </div>
            <div className="backdrop-blur-md bg-white/10 border border-white/25 rounded-2xl shadow-2xl p-6 transition-all duration-300 hover:bg-white/20 hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]">
              <h3 className="text-xl font-bold mb-3">
                <span className="bg-[#75bfcf] px-2 text-black">Live Oracle Feed</span>
              </h3>
              <p className="text-white/80 leading-relaxed">
                Oracle-driven rounds pull from the Coinbase BTC/USD spot feed in real time,
                ensuring fair and transparent price resolution.
              </p>
            </div>
            <div className="backdrop-blur-md bg-white/10 border border-white/25 rounded-2xl shadow-2xl p-6 transition-all duration-300 hover:bg-white/20 hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]">
              <h3 className="text-xl font-bold mb-3">
                <span className="bg-[#75bfcf] px-2 text-black">Fast Market Rhythm</span>
              </h3>
              <p className="text-white/80 leading-relaxed">
                30-second round length, 3-second close buffer, continuous cycle.
                For a fast, engaging prediction market experience.
              </p>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
