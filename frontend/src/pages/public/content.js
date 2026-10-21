import { Target, Layers, Users, Receipt, BadgeIndianRupee, MessageCircleQuestion } from 'lucide-react';

// Copy shared by the homepage, Why Us, Vision & Mission and About pages, so the wording stays the same everywhere.

export const ABOUT_HEADLINE = 'We teach practical digital skills, one course at a time.';

export const ABOUT_TEXT =
  'AroviaSkillTech helps people learn the digital skills used every day to create content, run campaigns and sell online — from AI tools and graphic design to video editing, social media and sales.';

// Shown with the founder photo (public/founder/founder.png) in the homepage "About us" section. Add the founder's name here.
export const FOUNDER = { name: '', role: 'Founder, AroviaSkillTech' };

// About page "Our team". Drop each photo into public/team/ under the file name in `photo`
// (portrait, ~4:5 works best); until it's there, a placeholder silhouette is shown. `role` is optional.
export const TEAM = [
  { name: 'Shiv Pratap Singh', role: 'Co-founder', photo: '/team/shiv-pratap-singh.jpg', about: 'Keeps operations running smoothly for every learner.' },
  { name: 'Suman Tiwari', photo: '/team/suman-tiwari.jpg', about: 'Leads the vision and direction of AroviaSkillTech.' },
  { name: 'Khushbu Saini', photo: '/team/khushbu-saini.jpg', about: 'Shapes our courses so every lesson is practical and clear.' },
  { name: 'Sourabh Thakur', photo: '/team/sourabh-thakur.jpg', about: 'Builds the partnerships and growth that move us forward.' },
  { name: 'Kittu Fauzdar', photo: '/team/kittu-fauzdar.jpg', about: 'Helps learners find the right course and stay on track.' },
  { name: 'Pranjali Chaurasiya', photo: '/team/pranjali-chaurasiya.jpg', about: 'Grows our community and the stories we share.' },
  { name: 'Khushbu yadav', photo: '/team/khushbu_yadav.jpg', about: 'Shapes our courses so every lesson is practical and clear.' },
  { name: 'Priya Rathore', photo: '/team/priya.jpg', about: 'Grows our community and the stories we share.' },
];

export const MISSION =
  'To make in-demand digital skills accessible to everyone, with clear, practical courses that help learners create, work and grow with confidence.';

export const VISION =
  'A community where education meets opportunity — where every learner can build a confident career in the digital economy.';

export const VALUES = [
  ['Learn', 'Master in-demand digital skills through practical, industry-focused courses.'],
  ['Practise', 'Apply each lesson step by step until it becomes second nature.'],
  ['Create', 'Turn your skills into content, designs, videos and campaigns.'],
  ['Share', 'Help others start their journey by sharing what you know.'],
  ['Grow', 'Keep learning, keep improving, keep going.'],
];

// Homepage "Success stories". SAMPLE TEXT — replace with real learners' words (and their permission) before launch.
// Keep them about what people learned and made, not money earned.
export const TESTIMONIALS = [
  {
    name: 'Neha Sharma', place: 'Jaipur', course: 'Graphic Design',
    quote: 'I used to wait on someone else for every poster for our family shop. Now I design our festival offers and Instagram posts myself, usually in under an hour.',
  },
  {
    name: 'Rohit Verma', place: 'Lucknow', course: 'Video Editing',
    quote: 'The short-form module changed how I cut reels. My videos are tighter, and people actually watch them to the end now.',
  },
  {
    name: 'Priya Menon', place: 'Pune', course: 'AI Tools Mastery',
    quote: 'I finally know how to use AI tools properly at work. Drafting emails and reports takes me half the time it used to.',
  },
];

// The first four are shown on the homepage; the Why Us page shows all of them.
export const WHY_POINTS = [
  [Target, 'Practical from day one', 'Courses focus on things you can actually make — posts, videos, ads, designs — not theory for its own sake.'],
  [Layers, 'Clear, structured modules', 'Each course is split into modules and topics, so you always know what comes next.'],
  [Users, 'Mentors who do the work', 'Learn alongside people who have built their own digital careers.'],
  [Receipt, 'One payment, no subscription', 'Pay once for your bundle. GST is included in the price you see.'],
  [BadgeIndianRupee, 'Prices shown upfront', 'Every bundle price is listed openly, with exactly which courses it includes.'],
  [MessageCircleQuestion, 'Help when you need it', 'Questions about a course, a payment or your account? Our team is a message away.'],
];
