import Link from "next/link";

type Props = {
  children: React.ReactNode;
};

export function AppShell({ children }: Props) {
  return (
    <div className="page-shell">
      <nav className="glass-card glass-nav">
        <h6 className="brand-lock">Aleo Flash Markets</h6>
        <div className="nav-links">
          <Link className="nav-link" href="/">
            <h6>Home</h6>
          </Link>
          <Link className="nav-link" href="/trade">
            <h6>Trade</h6>
          </Link>
          <Link className="nav-link" href="/history">
            <h6>History</h6>
          </Link>
          <Link className="nav-link" href="/portfolio">
            <h6>Portfolio</h6>
          </Link>
        </div>
      </nav>
      {children}
    </div>
  );
}
