import { useDispatch, useSelector } from 'react-redux';
import { Moon, Sun } from 'lucide-react';
import { toggleTheme } from '../../features/ui/uiSlice';

/** Light/dark switch for the member and admin apps (the website is always light). */
export default function ThemeToggle({ className = 'rounded-xl p-2', iconClassName = 'size-5' }) {
  const dispatch = useDispatch();
  const dark = useSelector((s) => s.ui.theme) === 'dark';
  const label = dark ? 'Switch to light theme' : 'Switch to dark theme';
  return (
    <button type="button" onClick={() => dispatch(toggleTheme())} aria-label={label} title={label}
      className={`text-muted hover:bg-fg/5 hover:text-fg ${className}`}>
      {dark ? <Sun className={iconClassName} /> : <Moon className={iconClassName} />}
    </button>
  );
}
