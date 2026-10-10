import { useState } from 'react';
import { GraduationCap, Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { useAdminCoursesQuery, useCreateCourseMutation, useUpdateCourseMutation } from '../../api/adminApi';
import {
  PageHeader, Card, Button, Modal, Input, Select, Textarea, StatusBadge, PageLoader, ErrorState, DataTable,
} from '../../components/ui';
import CourseIcon, { COURSE_ICONS } from '../../components/common/CourseIcon';
import { useAction } from '../../lib/useAction';

const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'All levels'];
const lines = (text) => text.split('\n').map((s) => s.trim()).filter(Boolean);
const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

const EMPTY = {
  title: '', slug: '', category: '', level: 'Beginner', icon: 'graduation-cap', summary: '', description: '', outcomes: '',
  modules: [{ title: '', topics: '' }], status: 'active', sortOrder: 0,
};

function Editor({ course, categories, nextOrder, onClose }) {
  const isNew = !course;
  const [form, setForm] = useState(() => (course ? {
    ...course,
    outcomes: course.outcomes.join('\n'),
    modules: course.modules.map((m) => ({ title: m.title, topics: m.topics.join('\n') })),
  } : { ...EMPTY, sortOrder: nextOrder }));
  const [slugEdited, setSlugEdited] = useState(false);
  const [createT, { isLoading: creating }] = useCreateCourseMutation();
  const [updateT, { isLoading: updating }] = useUpdateCourseMutation();
  const create = useAction(createT);
  const update = useAction(updateT);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setTitle = (e) => {
    const title = e.target.value;
    setForm((f) => ({ ...f, title, slug: isNew && !slugEdited ? slugify(title) : f.slug }));
  };
  const setModule = (i, k) => (e) => setForm((f) => ({ ...f, modules: f.modules.map((m, j) => (j === i ? { ...m, [k]: e.target.value } : m)) }));

  const save = async () => {
    const body = {
      title: form.title, category: form.category, level: form.level, icon: form.icon, summary: form.summary, description: form.description,
      outcomes: lines(form.outcomes),
      modules: form.modules.filter((m) => m.title.trim()).map((m) => ({ title: m.title.trim(), topics: lines(m.topics) })),
      status: form.status, sortOrder: Number(form.sortOrder) || 0,
    };
    const ok = isNew ? await create({ ...body, slug: form.slug }) : await update({ id: course._id, ...body });
    if (ok) onClose();
  };

  return (
    <Modal open onClose={onClose} size="lg" title={isNew ? 'New course' : `Edit ${course.title}`}
      subtitle="Shown on the website's course pages. Choose which bundles include it under Bundles & Income."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={creating || updating} onClick={save}>{isNew ? 'Create course' : 'Save course'}</Button></>}>
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Title" value={form.title} onChange={setTitle} required />
          <Input label="URL slug" value={form.slug} disabled={!isNew} required
            onChange={(e) => { setSlugEdited(true); setForm((f) => ({ ...f, slug: slugify(e.target.value) })); }}
            hint={isNew ? `Page address: /courses/${form.slug || '…'}` : 'The slug cannot be changed after the course is created.'} />
          <div>
            <Input label="Category" value={form.category} onChange={set('category')} list="course-categories" required hint="Pick an existing category or type a new one." />
            <datalist id="course-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <Select label="Level" value={form.level} onChange={set('level')} options={LEVELS.map((l) => ({ value: l, label: l }))} />
          <div>
            <Select label="Icon" value={form.icon} onChange={set('icon')} options={Object.keys(COURSE_ICONS).map((k) => ({ value: k, label: k.replace(/-/g, ' ') }))} />
            <p className="mt-1.5 flex items-center gap-2 text-xs text-subtle">Preview <CourseIcon icon={form.icon} className="size-4 text-gold-300" /></p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Status" value={form.status} onChange={set('status')} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Hidden' }]} />
            <Input label="Sort order" type="number" min="0" value={form.sortOrder} onChange={set('sortOrder')} />
          </div>
        </div>

        <Input label="Short summary" value={form.summary} onChange={set('summary')} maxLength={300} hint="One line shown on course cards." />
        <Textarea label="Description" value={form.description} onChange={set('description')} rows={3} />
        <Textarea label="What you’ll learn (one per line)" value={form.outcomes} onChange={set('outcomes')} rows={4} />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wide text-muted">Curriculum modules</p>
            <Button size="sm" variant="outline" disabled={form.modules.length >= 40}
              onClick={() => setForm((f) => ({ ...f, modules: [...f.modules, { title: '', topics: '' }] }))}><Plus className="size-3.5" /> Module</Button>
          </div>
          <div className="space-y-3">
            {form.modules.map((m, i) => (
              <div key={i} className="rounded-2xl border border-line bg-ink-900 p-3">
                <div className="flex items-end gap-2">
                  <Input className="flex-1" label={`Module ${i + 1} title`} value={m.title} onChange={setModule(i, 'title')} />
                  <Button size="icon" variant="ghost" aria-label={`Remove module ${i + 1}`}
                    onClick={() => setForm((f) => ({ ...f, modules: f.modules.filter((_, j) => j !== i) }))}><Trash2 className="size-4" /></Button>
                </div>
                <Textarea className="mt-3" label="Topics (one per line)" value={m.topics} onChange={setModule(i, 'topics')} rows={3} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function AdminCourses() {
  const { data, isLoading, error, refetch } = useAdminCoursesQuery();
  const [editing, setEditing] = useState(null); // null = closed, 'new' = create, course = edit
  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  const { courses } = data;
  const categories = [...new Set(courses.map((c) => c.category))];

  return (
    <div>
      <PageHeader icon={GraduationCap} title="Course Catalog"
        subtitle="Courses shown on the website. Choose which bundles include each course under Bundles & Income."
        actions={<Button onClick={() => setEditing('new')}><Plus className="size-4" /> New course</Button>} />
      <Card>
        <DataTable rows={courses}
          columns={[
            {
              key: 'title', header: 'Course',
              render: (c) => (
                <div className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-fg/[0.06] text-gold-300"><CourseIcon icon={c.icon} className="size-4" /></span>
                  <div>
                    <p className="font-semibold">{c.title}</p>
                    <p className="text-xs text-subtle">/courses/{c.slug}</p>
                  </div>
                </div>
              ),
            },
            { key: 'category', header: 'Category', render: (c) => <span className="text-muted">{c.category}</span> },
            { key: 'level', header: 'Level', render: (c) => <span className="text-muted">{c.level}</span> },
            { key: 'modules', header: 'Modules', render: (c) => c.modules.length },
            { key: 'bundles', header: 'In bundles', render: (c) => (c.bundles.length ? <span className="text-xs text-muted">{c.bundles.join(', ')}</span> : <span className="text-xs text-warning">None</span>) },
            { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} label={c.status === 'active' ? 'Active' : 'Hidden'} /> },
            {
              key: 'actions', header: '', align: 'right',
              render: (c) => (
                <div className="flex justify-end gap-1">
                  {c.status === 'active' && (
                    <Button size="icon" variant="ghost" href={`/courses/${c.slug}`} target="_blank" rel="noreferrer" aria-label={`Open ${c.title} on the website`}><ExternalLink className="size-4" /></Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setEditing(c)}><Pencil className="size-3.5" /> Edit</Button>
                </div>
              ),
            },
          ]}
        />
      </Card>
      {editing && (
        <Editor course={editing === 'new' ? null : editing} categories={categories}
          nextOrder={Math.max(0, ...courses.map((c) => c.sortOrder || 0)) + 1} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
