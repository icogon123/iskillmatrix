import {
  Bot, Palette, Clapperboard, Camera, MonitorPlay, Megaphone, Magnet, Handshake, MessageSquare, BadgeCheck, GraduationCap, Code,
  PenTool, TrendingUp, Briefcase, Languages, Music, BookOpen, Calculator, Smartphone, ShoppingCart, Mic, Lightbulb, Rocket,
} from 'lucide-react';

// Icon keys stored on each course (Course.icon). The admin picks one of these in the course editor.
export const COURSE_ICONS = {
  bot: Bot,
  palette: Palette,
  clapperboard: Clapperboard,
  camera: Camera,
  'monitor-play': MonitorPlay,
  megaphone: Megaphone,
  magnet: Magnet,
  handshake: Handshake,
  'message-square': MessageSquare,
  'badge-check': BadgeCheck,
  'graduation-cap': GraduationCap,
  code: Code,
  'pen-tool': PenTool,
  'trending-up': TrendingUp,
  briefcase: Briefcase,
  languages: Languages,
  music: Music,
  'book-open': BookOpen,
  calculator: Calculator,
  smartphone: Smartphone,
  'shopping-cart': ShoppingCart,
  mic: Mic,
  lightbulb: Lightbulb,
  rocket: Rocket,
};

export default function CourseIcon({ icon, className = 'size-5' }) {
  const Icon = COURSE_ICONS[icon] || GraduationCap;
  return <Icon className={className} />;
}

// Course cover class per category (.cover-N in index.css): violet / indigo / plum in the app, orange / charcoal
// on the light website. Categories the admin adds later get one of the fallbacks.
const CATEGORY_TONES = {
  'AI & Tech': 'cover-0',
  'Design & Video': 'cover-1',
  'Social Media': 'cover-2',
  Marketing: 'cover-3',
  Business: 'cover-4',
  'Personal Growth': 'cover-5',
};
const FALLBACK_TONES = ['cover-6', 'cover-7', 'cover-8'];

export function categoryTone(category = '') {
  if (CATEGORY_TONES[category]) return CATEGORY_TONES[category];
  const hash = [...category].reduce((a, c) => a + c.charCodeAt(0), 0);
  return FALLBACK_TONES[hash % FALLBACK_TONES.length];
}
