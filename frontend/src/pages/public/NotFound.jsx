import { Button } from '../../components/ui';
import Logo from '../../components/common/Logo';

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="text-center">
        <Logo className="justify-center" />
        <p className="glow-title mt-10 font-display text-7xl font-black text-fg">404</p>
        <p className="mt-3 text-muted">The page you are looking for does not exist.</p>
        <Button to="/" className="mt-8">Back to home</Button>
      </div>
    </div>
  );
}
