import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Menu, X, Mail, Phone, MapPin, ArrowRight } from 'lucide-react';
import Logo from '../common/Logo';
import { COMPANY_LEGAL_NAME } from '../../lib/constants';
import { Button, PageLoader } from '../ui';
import { useSiteQuery, useCoursesQuery } from '../../api/publicApi';
import { selectUser } from '../../features/auth/authSlice';

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/courses', label: 'Courses' },
  { to: '/why-us', label: 'Why Us' },
  { to: '/vision-mission', label: 'Vision & Mission' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

const footerLink = 'underline-offset-4 hover:underline';

export default function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const user = useSelector(selectUser);
  const { data } = useSiteQuery();
  const { data: courseData } = useCoursesQuery();
  const site = data?.site;
  const footerCourses = (courseData?.courses || []).slice(0, 5);

  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  const dashboardLink = user?.role === 'admin' ? '/admin' : '/app';

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 bg-char-900 text-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo tone="onDark" />
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}
                className={({ isActive }) => `rounded-lg px-3.5 py-2 text-sm font-medium transition ${isActive ? 'text-brand-400' : 'text-white/75 hover:text-white'}`}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
            {user ? (
              <Button to={dashboardLink} variant="accent">My dashboard <ArrowRight className="size-4" /></Button>
            ) : (
              <>
                <Button to="/login" variant="onBrand">Log in</Button>
                <Button to="/register" variant="accent">Get started</Button>
              </>
            )}
          </div>
          <button type="button" className="rounded-lg p-2 text-white lg:hidden" onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
        {open && (
          <div className="border-t border-white/10 bg-char-900 px-4 pb-5 lg:hidden">
            <nav className="flex flex-col py-2">
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end}
                  className={({ isActive }) => `rounded-lg px-3 py-3 text-base font-medium ${isActive ? 'text-brand-400' : 'text-white/85'}`}>
                  {n.label}
                </NavLink>
              ))}
            </nav>
            <div className="grid grid-cols-2 gap-2">
              {user ? (
                <Button to={dashboardLink} variant="accent" className="col-span-2">My dashboard</Button>
              ) : (
                <>
                  <Button to="/login" variant="onBrand">Log in</Button>
                  <Button to="/register" variant="accent">Get started</Button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* Pages load inside the layout, so the header and footer stay while a page's code downloads */}
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="bg-brand-500 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-5">
          <div className="md:col-span-2">
            <Logo tone="white" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed">
              {site?.tagline || 'Learn Skills. Build Your Future.'} Practical online courses in AI tools, design, video, social media, marketing and more.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-bold tracking-wide uppercase">Explore</h4>
            <ul className="mt-3 space-y-2 text-sm">
              {NAV.slice(1).map((n) => (
                <li key={n.to}><Link className={footerLink} to={n.to}>{n.label}</Link></li>
              ))}
              <li><Link className={footerLink} to="/pricing">Pricing</Link></li>
              <li><Link className={footerLink} to="/register">Create account</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold tracking-wide uppercase">Popular courses</h4>
            <ul className="mt-3 space-y-2 text-sm">
              {footerCourses.map((c) => (
                <li key={c.slug}><Link className={footerLink} to={`/courses/${c.slug}`}>{c.title}</Link></li>
              ))}
              <li><Link className={footerLink} to="/courses">All courses</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold tracking-wide uppercase">Contact</h4>
            <ul className="mt-3 space-y-2.5 text-sm">
              {site?.email && <li className="flex gap-2"><Mail className="mt-0.5 size-4 shrink-0" /><a href={`mailto:${site.email}`} className={`min-w-0 wrap-anywhere ${footerLink}`}>{site.email}</a></li>}
              {site?.phone && <li className="flex gap-2"><Phone className="mt-0.5 size-4 shrink-0" />{site.phone}</li>}
              {site?.address && <li className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0" />{site.address}</li>}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/20">
          <p className="mx-auto max-w-6xl px-4 py-5 text-xs sm:px-6">© {new Date().getFullYear()} {COMPANY_LEGAL_NAME}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
