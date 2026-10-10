import mongoose from 'mongoose';

// A course in the public catalog (AI Tools Mastery, Graphic Design, …). Courses are not bought on their own:
// members buy a bundle (Package), and Package.courses lists the course slugs that bundle includes.
const moduleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    topics: { type: [String], default: [] },
  },
  { _id: false },
);

const courseSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, default: 'General', trim: true },
    level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced', 'All levels'], default: 'Beginner' },
    icon: { type: String, default: 'graduation-cap' }, // icon key the website maps to an icon
    summary: { type: String, default: '' },
    description: { type: String, default: '' },
    outcomes: { type: [String], default: [] }, // "What you'll learn"
    modules: { type: [moduleSchema], default: [] }, // curriculum
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.model('Course', courseSchema);
