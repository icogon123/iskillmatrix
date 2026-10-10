// Default course catalog, created on first start. Everything here is starter content: the admin edits it
// under Admin → Course Catalog, and changes there are never overwritten by this file.
const mod = (title, topics) => ({ title, topics });

export const DEFAULT_COURSES = [
  {
    slug: 'ai-tools-mastery', title: 'AI Tools Mastery', category: 'AI & Tech', level: 'Beginner', icon: 'bot', sortOrder: 1,
    summary: 'Use ChatGPT and other AI tools to write, design, research and work faster.',
    description: 'A hands-on introduction to the AI tools that are changing how digital work gets done. Learn to write clear prompts, create content and images with AI, and build simple workflows that save hours every week.',
    outcomes: [
      'Write prompts that get useful, accurate results',
      'Create posts, scripts and captions with AI writing tools',
      'Generate and edit images with AI image tools',
      'Automate repetitive tasks with simple AI workflows',
    ],
    modules: [
      mod('Getting started with AI', ['What AI tools can and cannot do', 'Setting up your AI toolkit', 'Using AI responsibly']),
      mod('Prompting that works', ['Anatomy of a good prompt', 'Roles, examples and output formats', 'Improving answers step by step']),
      mod('AI for content creation', ['Writing posts, scripts and captions', 'AI images and design', 'Voice-overs and video helpers']),
      mod('AI for productivity', ['Research and summaries', 'Emails, documents and spreadsheets', 'Building simple workflows']),
    ],
  },
  {
    slug: 'graphic-design', title: 'Graphic Design', category: 'Design & Video', level: 'Beginner', icon: 'palette', sortOrder: 2,
    summary: 'Design eye-catching posts, banners and brand graphics with easy, free tools.',
    description: 'Learn the design basics that make content stand out — layout, colour and typography — and put them to work in Canva and similar tools to create social posts, thumbnails and brand material.',
    outcomes: [
      'Apply layout, colour and typography principles',
      'Design social media posts, banners and thumbnails',
      'Build a simple, consistent brand kit',
      'Export files in the right format for every platform',
    ],
    modules: [
      mod('Design fundamentals', ['Layout and visual hierarchy', 'Colour theory basics', 'Choosing and pairing fonts']),
      mod('Working in Canva', ['Templates, elements and layers', 'Photos, icons and backgrounds', 'Setting up a brand kit']),
      mod('Designing for social media', ['Posts and carousels', 'Story and reel covers', 'YouTube thumbnails']),
      mod('Finishing and delivery', ['Export settings and file types', 'Print-ready designs', 'Building your portfolio']),
    ],
  },
  {
    slug: 'video-editing', title: 'Video Editing', category: 'Design & Video', level: 'Beginner', icon: 'clapperboard', sortOrder: 3,
    summary: 'Edit short-form and YouTube videos that keep viewers watching.',
    description: 'Go from raw clips to polished videos. Learn cutting, pacing, captions, music and colour on mobile and desktop editors, with a focus on reels, shorts and YouTube content.',
    outcomes: [
      'Cut and arrange clips with good pacing',
      'Add captions, text, music and sound effects',
      'Use transitions and basic colour correction',
      'Export for Reels, Shorts and YouTube',
    ],
    modules: [
      mod('Editing basics', ['Choosing an editor (mobile and desktop)', 'Importing and organising footage', 'The timeline and basic cuts']),
      mod('Story and pacing', ['Hooks in the first three seconds', 'Jump cuts and B-roll', 'Pacing for short-form video']),
      mod('Polish', ['Captions and animated text', 'Music, sound effects and audio clean-up', 'Colour correction basics']),
      mod('Publishing', ['Export settings per platform', 'Thumbnails and covers', 'A repeatable editing workflow']),
    ],
  },
  {
    slug: 'instagram-mastery', title: 'Instagram Mastery', category: 'Social Media', level: 'Beginner', icon: 'camera', sortOrder: 4,
    summary: 'Grow an engaged Instagram audience with reels, carousels and a clear content plan.',
    description: 'Understand how Instagram works today and build a profile people want to follow. Plan your content, create reels and carousels, and use insights to grow steadily.',
    outcomes: [
      'Set up a profile that turns visitors into followers',
      'Plan a month of content around clear themes',
      'Create reels, carousels and stories that get engagement',
      'Read insights and improve what you post',
    ],
    modules: [
      mod('Profile foundations', ['Choosing your niche', 'Bio, highlights and profile photo', 'Creator vs business accounts']),
      mod('Content that performs', ['Reel ideas and formats', 'Carousels that get saved', 'Stories for daily engagement']),
      mod('Growth', ['Captions, hashtags and search', 'Collaborations and community', 'Posting consistently']),
      mod('Measure and improve', ['Understanding Instagram insights', 'Testing new formats', 'Turning followers into customers']),
    ],
  },
  {
    slug: 'youtube-mastery', title: 'YouTube Mastery', category: 'Social Media', level: 'Beginner', icon: 'monitor-play', sortOrder: 5,
    summary: 'Start and grow a YouTube channel with videos people search for and watch.',
    description: 'Plan, publish and optimise videos for YouTube. Learn channel setup, topic research, titles and thumbnails, Shorts, and how to use analytics to grow.',
    outcomes: [
      'Set up and brand a YouTube channel',
      'Find video topics people are searching for',
      'Write titles and design thumbnails that get clicks',
      'Use YouTube Studio analytics to grow',
    ],
    modules: [
      mod('Channel setup', ['Choosing your channel niche', 'Channel art, about page and links', 'Equipment on a budget']),
      mod('Content planning', ['Topic and keyword research', 'Scripting and structure', 'Long videos vs Shorts']),
      mod('Optimisation', ['Titles, descriptions and tags', 'Thumbnails that stand out', 'Playlists and end screens']),
      mod('Growth and analytics', ['Reading YouTube Studio', 'Retention and click-through rate', 'Building a posting routine']),
    ],
  },
  {
    slug: 'meta-ads', title: 'Meta Ads', category: 'Marketing', level: 'Intermediate', icon: 'megaphone', sortOrder: 6,
    summary: 'Run Facebook and Instagram ad campaigns that reach the right people.',
    description: 'Learn to plan, launch and improve paid campaigns in Meta Ads Manager — from choosing objectives and audiences to writing ad copy, testing creatives and reading results.',
    outcomes: [
      'Set up Business Manager, ad accounts and the pixel',
      'Choose the right campaign objective and audience',
      'Create ad creatives and copy that convert',
      'Test, measure and improve campaigns on a budget',
    ],
    modules: [
      mod('Ads Manager basics', ['Business Manager and ad accounts', 'Campaigns, ad sets and ads', 'Installing the Meta pixel']),
      mod('Audiences and targeting', ['Core audiences', 'Custom and lookalike audiences', 'Placements']),
      mod('Creatives and copy', ['Image and video ads', 'Writing ad copy', 'Offers and calls to action']),
      mod('Budget, testing and reporting', ['Budgets and bidding', 'A/B testing', 'Reading results and scaling']),
    ],
  },
  {
    slug: 'lead-generation', title: 'Lead Generation', category: 'Marketing', level: 'Intermediate', icon: 'magnet', sortOrder: 7,
    summary: 'Attract and capture potential customers with lead magnets, forms and follow-ups.',
    description: 'Build a simple system that brings in interested prospects: understand your ideal customer, create lead magnets and landing pages, capture contacts and follow up until they are ready to buy.',
    outcomes: [
      'Define your ideal customer and offer',
      'Create lead magnets and simple landing pages',
      'Capture leads with forms, WhatsApp and social media',
      'Follow up and nurture leads into customers',
    ],
    modules: [
      mod('Understanding your customer', ['Ideal customer profile', 'Problems and offers', 'Where your customers spend time']),
      mod('Lead magnets and landing pages', ['Lead magnet ideas', 'Landing page structure', 'Tools to build pages fast']),
      mod('Capturing leads', ['Forms and lead ads', 'WhatsApp and DMs', 'Organising leads in a sheet or CRM']),
      mod('Follow-up and nurturing', ['Follow-up messages', 'Email and WhatsApp sequences', 'Measuring conversion']),
    ],
  },
  {
    slug: 'sales-mastery', title: 'Sales Mastery', category: 'Business', level: 'Intermediate', icon: 'handshake', sortOrder: 8,
    summary: 'Learn a simple, honest sales process — from first conversation to closing.',
    description: 'Selling is a skill anyone can learn. Practise a clear process for understanding needs, presenting solutions, handling objections and closing — online and in person.',
    outcomes: [
      'Run discovery conversations that uncover real needs',
      'Present your offer clearly and confidently',
      'Handle common objections calmly',
      'Close and follow up without being pushy',
    ],
    modules: [
      mod('Sales mindset', ['What good selling looks like', 'Building trust', 'Setting goals and tracking activity']),
      mod('Discovery', ['Asking the right questions', 'Active listening', 'Qualifying prospects']),
      mod('Presenting and objections', ['Presenting value, not features', 'Common objections and answers', 'Selling on calls and chat']),
      mod('Closing and follow-up', ['Closing techniques', 'Follow-up routines', 'Referrals and repeat customers']),
    ],
  },
  {
    slug: 'communication-skills', title: 'Communication Skills', category: 'Personal Growth', level: 'Beginner', icon: 'message-square', sortOrder: 9,
    summary: 'Speak, write and present with clarity and confidence.',
    description: 'Strong communication makes every other skill more valuable. Build confidence in speaking, write clear messages and posts, and present ideas on camera and on stage.',
    outcomes: [
      'Speak clearly and confidently in conversations',
      'Write clear messages, emails and posts',
      'Structure and deliver short presentations',
      'Come across well on video calls and camera',
    ],
    modules: [
      mod('Foundations', ['How communication works', 'Listening skills', 'Body language and tone']),
      mod('Speaking with confidence', ['Overcoming hesitation', 'Structuring what you say', 'Storytelling basics']),
      mod('Writing clearly', ['Messages and emails', 'Social media writing', 'Editing for clarity']),
      mod('Presentations and video', ['Planning a presentation', 'Speaking on camera', 'Handling questions']),
    ],
  },
  {
    slug: 'personal-branding', title: 'Personal Branding', category: 'Personal Growth', level: 'Beginner', icon: 'badge-check', sortOrder: 10,
    summary: 'Build a personal brand that helps people know, like and trust you online.',
    description: 'Define what you stand for and show it consistently online. Shape your story, set up your profiles and create content that builds your reputation over time.',
    outcomes: [
      'Define your strengths, audience and message',
      'Set up consistent profiles across platforms',
      'Tell your story through content',
      'Grow your reputation and network',
    ],
    modules: [
      mod('Finding your brand', ['Strengths and values', 'Choosing your audience', 'Your brand message']),
      mod('Your online presence', ['Profile photos and bios', 'Consistent visuals', 'LinkedIn, Instagram and more']),
      mod('Content and storytelling', ['Telling your story', 'Content pillars', 'Showing your work']),
      mod('Growing your reputation', ['Networking online', 'Testimonials and social proof', 'Staying consistent']),
    ],
  },
];

// Course slugs per bundle, matching the original bundle benefits (each bundle includes the previous one).
const STARTER = ['communication-skills', 'personal-branding'];
const BASIC = [...STARTER, 'instagram-mastery', 'graphic-design'];
const STANDARD = [...BASIC, 'youtube-mastery', 'video-editing'];
const PREMIUM = [...STANDARD, 'meta-ads', 'lead-generation'];
const PRO = [...PREMIUM, 'sales-mastery', 'ai-tools-mastery'];

export const DEFAULT_BUNDLE_COURSES = { starter: STARTER, basic: BASIC, standard: STANDARD, premium: PREMIUM, pro: PRO };
