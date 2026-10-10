import { Button } from '../../components/ui';
import Logo from '../../components/common/Logo';
import { usePageTitle } from '../../lib/usePageTitle';

export default function NotFound() {
  usePageTitle('Page not found');
  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <div className="max-w-sm text-center">
        <Logo className="justify-center" />
        <p className="mt-10 text-sm font-semibold text-gold-400">404</p>
        <h1 className="mt-2 text-2xl font-bold text-fg">This page doesn’t exist</h1>
        <p className="mt-2 text-muted">The link may be broken, or the page may have moved.</p>
        <div className="mt-8 flex justify-center gap-2">
          <Button to="/" variant="solid">Go to home</Button>
          <Button to="/courses" variant="quiet">Browse courses</Button>
        </div>
      </div>
    </div>
  );
}
