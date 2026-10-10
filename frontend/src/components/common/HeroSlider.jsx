import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Banners live in public/headerBanner. The text is part of each image, so `alt` repeats it for screen readers. */
const SLIDES = [
  {
    src: '/headerBanner/banner1.png',
    to: '/courses?category=Design%20%26%20Video',
    alt: 'Turn creativity into a career. Master graphic design, video editing and art. Explore design courses.',
  },
  {
    src: '/headerBanner/banner2.png',
    to: '/courses?category=Marketing',
    alt: 'Scale your business and freelance career. Practical strategies in lead generation, sales mastery and Meta ads. Start learning now.',
  },
  {
    src: '/headerBanner/banner3.png',
    to: '/pricing',
    alt: 'Fast-track your career with in-demand skills. 1-on-1 mentorship, recognised certificate and hands-on projects. Get started today.',
  },
];

const INTERVAL = 5000;
const SWIPE_PX = 40;

const arrow = 'absolute top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/55 focus-visible:outline-2 focus-visible:outline-white sm:grid';

export default function HeroSlider() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [hidden, setHidden] = useState(() => document.hidden);
  const touchX = useRef(null);
  const count = SLIDES.length;

  const go = useCallback((i) => setIndex((i + count) % count), [count]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion = (e) => setReduceMotion(e.matches);
    const onVisibility = () => setHidden(document.hidden);
    mq.addEventListener('change', onMotion);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      mq.removeEventListener('change', onMotion);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Auto-advance; restarts whenever the slide changes so a manual click gets a full interval
  useEffect(() => {
    if (paused || reduceMotion || hidden) return undefined;
    const id = setTimeout(() => go(index + 1), INTERVAL);
    return () => clearTimeout(id);
  }, [index, paused, reduceMotion, hidden, go]);

  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > SWIPE_PX) go(dx < 0 ? index + 1 : index - 1);
  };

  return (
    <section aria-roledescription="carousel" aria-label="Featured courses"
      className="relative overflow-hidden bg-char-900"
      onPointerEnter={(e) => e.pointerType === 'mouse' && setPaused(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setPaused(false)}
      onFocus={(e) => e.target.matches(':focus-visible') && setPaused(true)} onBlur={() => setPaused(false)}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') go(index - 1);
        if (e.key === 'ArrowRight') go(index + 1);
      }}>
      <div className={`flex ${reduceMotion ? '' : 'transition-transform duration-700 ease-out'}`}
        style={{ transform: `translateX(-${index * 100}%)` }}>
        {SLIDES.map((s, i) => (
          <Link key={s.src} to={s.to} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${count}`}
            inert={i !== index} className="block w-full shrink-0">
            <img src={s.src} alt={s.alt} width={1584} height={672} draggable={false}
              fetchPriority={i === 0 ? 'high' : 'low'} decoding="async"
              className="aspect-[1584/672] w-full object-cover select-none" />
          </Link>
        ))}
      </div>

      <button type="button" onClick={() => go(index - 1)} aria-label="Previous banner" className={`${arrow} left-3 lg:left-6`}>
        <ChevronLeft className="size-5" />
      </button>
      <button type="button" onClick={() => go(index + 1)} aria-label="Next banner" className={`${arrow} right-3 lg:right-6`}>
        <ChevronRight className="size-5" />
      </button>

      <div className="absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5 sm:bottom-4">
        {SLIDES.map((s, i) => (
          <button key={s.src} type="button" onClick={() => go(i)} aria-label={`Show banner ${i + 1}`} aria-current={i === index}
            className={`h-1.5 rounded-full transition-all sm:h-2 ${i === index ? 'w-6 bg-white sm:w-8' : 'w-1.5 bg-white/50 hover:bg-white/80 sm:w-2'}`} />
        ))}
      </div>
    </section>
  );
}
