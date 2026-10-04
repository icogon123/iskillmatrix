import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Menu, X, Mail, Phone, MapPin, ArrowRight } from 'lucide-react';
import Logo from '../common/Logo';
import { Button } from '../ui';
import { useSiteQuery } from '../../api/publicApi';
import { selectUser } from '../../features/auth/authSlice';

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/plan', label: 'Income Plan' },
  { to: '/packages', label: 'Packages' },
  { to: '/contact', label: 'Contact' },
];

export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const user = useSelector(selectUser);
  const { data } = useSiteQuery();
  const site = data?.site;

  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  const dashboardLink = user?.role === 'admin' ? '/admin' : '/app';

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}
                className={({ isActive }) => `rounded-lg px-3.5 py-2 text-sm font-semibold transition ${isActive ? 'text-gold-400' : 'text-muted hover:text-fg'}`}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
            {user ? (
              <Button to={dashboardLink} size="md">Go to Dashboard <ArrowRight className="size-4" /></Button>
            ) : (
              <>
                <Button to="/login" variant="outline">Login</Button>
                <Button to="/register" variant="gold">Join Now</Button>
              </>
            )}
          </div>
          <button type="button" className="rounded-lg p-2 text-fg lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
        {open && (
          <div className="border-t border-line bg-ink-950 px-4 pb-5 lg:hidden">
            <nav className="flex flex-col py-2">
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end}
                  className={({ isActive }) => `rounded-lg px-3 py-3 text-sm font-semibold ${isActive ? 'text-gold-400' : 'text-muted'}`}>
                  {n.label}
                </NavLink>
              ))}
            </nav>
            <div className="grid grid-cols-2 gap-2">
              {user ? (
                <Button to={dashboardLink} className="col-span-2">Go to Dashboard</Button>
              ) : (
                <>
                  <Button to="/login" variant="outline">Login</Button>
                  <Button to="/register" variant="gold">Join Now</Button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-ink-900/60">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              {site?.tagline || 'Learn Skills. Build Your Future.'} Learn trending digital skills and grow your income with your team.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-bold text-fg">Explore</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {NAV.slice(1).map((n) => (
                <li key={n.to}><Link className="hover:text-gold-400" to={n.to}>{n.label}</Link></li>
              ))}
              <li><Link className="hover:text-gold-400" to="/register">Join Now</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold text-fg">Contact</h4>
            <ul className="mt-3 space-y-2.5 text-sm text-muted">
              {site?.email && <li className="flex gap-2"><Mail className="mt-0.5 size-4 shrink-0 text-brand-400" /><a href={`mailto:${site.email}`} className="hover:text-fg">{site.email}</a></li>}
              {site?.phone && <li className="flex gap-2"><Phone className="mt-0.5 size-4 shrink-0 text-brand-400" />{site.phone}</li>}
              {site?.address && <li className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-brand-400" />{site.address}</li>}
            </ul>
          </div>
        </div>
        <div className="border-t border-line py-5 text-center text-xs text-subtle">
          © {new Date().getFullYear()} {site?.name || 'iSkillMatrix'}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
