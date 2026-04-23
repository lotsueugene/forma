'use client';

import { useState, useEffect } from 'react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import {
  Plus,
  PencilSimple,
  Trash,
  Eye,
  EyeSlash,
  FloppyDisk,
  X,
  Briefcase,
  MagnifyingGlass,
  ArrowLeft,
  Star,
  MapPin,
  Clock,
} from '@phosphor-icons/react';

interface JobPosting {
  id: string;
  slug: string;
  title: string;
  department: string;
  location: string;
  type: string;
  description: string;
  requirements: string | null;
  benefits: string | null;
  salary: string | null;
  applyFormId: string | null;
  applyUrl: string | null;
  applyEmail: string | null;
  published: boolean;
  publishedAt: string | null;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FormaForm {
  id: string;
  name: string;
}

const departments = ['Engineering', 'Design', 'Product', 'Marketing', 'Sales', 'Operations', 'Support', 'Other'];
const jobTypes = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'];

export default function AdminCareersPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [forms, setForms] = useState<FormaForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmText: string;
    variant: 'danger' | 'warning' | 'default';
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    slug: '',
    title: '',
    department: 'Engineering',
    location: '',
    type: 'Full-time',
    description: '',
    requirements: '',
    benefits: '',
    salary: '',
    applyFormId: '',
    applyUrl: '',
    applyEmail: '',
    published: false,
    featured: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchJobs();
    fetchForms();
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/admin/careers');
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchForms = async () => {
    try {
      const res = await fetch('/api/forms');
      const data = await res.json();
      setForms(data.forms || []);
    } catch (error) {
      console.error('Error fetching forms:', error);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingJob(null);
    setFormData({
      slug: '',
      title: '',
      department: 'Engineering',
      location: '',
      type: 'Full-time',
      description: '',
      requirements: '',
      benefits: '',
      salary: '',
      applyFormId: '',
      applyUrl: '',
      applyEmail: '',
      published: false,
      featured: false,
    });
  };

  const handleEdit = (job: JobPosting) => {
    setEditingJob(job);
    setIsCreating(false);
    setFormData({
      slug: job.slug,
      title: job.title,
      department: job.department,
      location: job.location,
      type: job.type,
      description: job.description,
      requirements: job.requirements || '',
      benefits: job.benefits || '',
      salary: job.salary || '',
      applyFormId: job.applyFormId || '',
      applyUrl: job.applyUrl || '',
      applyEmail: job.applyEmail || '',
      published: job.published,
      featured: job.featured,
    });
  };

  const handleCancel = () => {
    setEditingJob(null);
    setIsCreating(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isCreating) {
        const res = await fetch('/api/admin/careers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const data = await res.json();
          setErrorMessage(data.error || 'Failed to create job');
          return;
        }
      } else if (editingJob) {
        const res = await fetch(`/api/admin/careers/${editingJob.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const data = await res.json();
          setErrorMessage(data.error || 'Failed to update job');
          return;
        }
      }
      await fetchJobs();
      handleCancel();
    } catch (error) {
      console.error('Error saving job:', error);
      setErrorMessage('Failed to save job');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmAction({
      title: 'Delete Job Posting',
      message: 'Are you sure you want to delete this job posting?',
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await fetch(`/api/admin/careers/${id}`, { method: 'DELETE' });
          await fetchJobs();
        } catch (error) {
          console.error('Error deleting job:', error);
        }
      },
    });
  };

  const togglePublish = async (job: JobPosting) => {
    try {
      await fetch(`/api/admin/careers/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !job.published }),
      });
      await fetchJobs();
    } catch (error) {
      console.error('Error toggling publish:', error);
    }
  };

  const toggleFeatured = async (job: JobPosting) => {
    try {
      await fetch(`/api/admin/careers/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: !job.featured }),
      });
      await fetchJobs();
    } catch (error) {
      console.error('Error toggling featured:', error);
    }
  };

  const filteredJobs = jobs.filter(
    (job) =>
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.department.toLowerCase().includes(search.toLowerCase()) ||
      job.location.toLowerCase().includes(search.toLowerCase())
  );

  // Editor view
  if (editingJob || isCreating) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {isCreating ? 'Create Job Posting' : 'Edit Job Posting'}
              </h1>
              <p className="text-sm text-gray-500">
                {isCreating ? 'Add a new open position' : `Editing: ${editingJob?.title}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCancel} className="btn btn-secondary">
              <X size={18} />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !formData.title || !formData.slug || !formData.location}
              className="btn btn-primary"
            >
              <FloppyDisk size={18} />
              {saving ? 'Saving...' : 'Save Job'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card p-6 space-y-4">
              <div className="form-field">
                <label className="form-label">Job Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => {
                    if (isCreating) {
                      setFormData({
                        ...formData,
                        title: e.target.value,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'),
                      });
                    } else {
                      setFormData({ ...formData, title: e.target.value });
                    }
                  }}
                  placeholder="e.g., Senior Software Engineer"
                  className="input"
                />
              </div>

              <div className="form-field">
                <label className="form-label">Slug</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">/careers/</span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="job-slug"
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-field">
                  <label className="form-label">Department</label>
                  <Select
                    value={formData.department}
                    onChange={(v) => setFormData({ ...formData, department: v })}
                    options={departments.map((dept) => ({ value: dept, label: dept }))}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Job Type</label>
                  <Select
                    value={formData.type}
                    onChange={(v) => setFormData({ ...formData, type: v })}
                    options={jobTypes.map((t) => ({ value: t, label: t }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-field">
                  <label className="form-label">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Remote, San Francisco, CA"
                    className="input"
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Salary Range (optional)</label>
                  <input
                    type="text"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    placeholder="e.g., $120k - $180k"
                    className="input"
                  />
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">Job Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the role, responsibilities, and what success looks like..."
                  rows={10}
                  className="input font-mono text-sm"
                />
                <p className="form-helper">Supports Markdown formatting</p>
              </div>

              <div className="form-field">
                <label className="form-label">Requirements (optional)</label>
                <textarea
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  placeholder="List required skills, experience, qualifications..."
                  rows={6}
                  className="input font-mono text-sm"
                />
              </div>

              <div className="form-field">
                <label className="form-label">Benefits (optional)</label>
                <textarea
                  value={formData.benefits}
                  onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                  placeholder="List benefits, perks, culture highlights..."
                  rows={4}
                  className="input font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="card p-6 space-y-4">
              <h3 className="font-medium text-gray-900">Publish</h3>
              <Checkbox
                checked={formData.published}
                onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                label="Publish this job"
              />
              <Checkbox
                checked={formData.featured}
                onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                label="Feature this job"
              />
            </div>

            <div className="card p-6 space-y-4">
              <h3 className="font-medium text-gray-900">Application</h3>
              <div className="form-field">
                <label className="form-label">Application Form</label>
                <Select
                  value={formData.applyFormId}
                  onChange={(v) => setFormData({ ...formData, applyFormId: v })}
                  placeholder="Select a form…"
                  options={forms.map((form) => ({ value: form.id, label: form.name }))}
                />
                <p className="form-helper">Recommended: Use a Forma form to collect applications</p>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-3">Or use external options:</p>
                <div className="form-field">
                  <label className="form-label">Apply URL</label>
                  <input
                    type="text"
                    value={formData.applyUrl}
                    onChange={(e) => setFormData({ ...formData, applyUrl: e.target.value })}
                    placeholder="https://..."
                    className="input"
                    disabled={!!formData.applyFormId}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Apply Email</label>
                  <input
                    type="email"
                    value={formData.applyEmail}
                    onChange={(e) => setFormData({ ...formData, applyEmail: e.target.value })}
                    placeholder="careers@example.com"
                    className="input"
                    disabled={!!formData.applyFormId}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Careers</h1>
          <p className="text-sm text-gray-500">Manage job postings</p>
        </div>
        <button onClick={handleCreate} className="btn btn-primary">
          <Plus size={18} />
          Create Job
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search jobs..."
          className="input input-with-icon"
        />
      </div>

      {/* Jobs List */}
      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading jobs...</div>
        ) : filteredJobs.length === 0 ? (
          <div className="p-8 text-center">
            <Briefcase size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 mb-4">
              {search ? 'No jobs match your search' : 'No job postings yet'}
            </p>
            {!search && (
              <button onClick={handleCreate} className="btn btn-primary">
                <Plus size={18} />
                Create your first job
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredJobs.map((job) => (
              <div key={job.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Briefcase size={20} className="text-gray-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{job.title}</h3>
                      {job.featured && (
                        <Star size={14} weight="fill" className="text-yellow-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span>{job.department}</span>
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {job.type}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`badge ${job.published ? 'badge-accent' : 'badge-warning'}`}
                  >
                    {job.published ? 'Published' : 'Draft'}
                  </span>
                  <button
                    onClick={() => toggleFeatured(job)}
                    className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${
                      job.featured ? 'text-yellow-500' : 'text-gray-400'
                    }`}
                    title={job.featured ? 'Unfeature' : 'Feature'}
                  >
                    <Star size={18} weight={job.featured ? 'fill' : 'regular'} />
                  </button>
                  <button
                    onClick={() => togglePublish(job)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title={job.published ? 'Unpublish' : 'Publish'}
                  >
                    {job.published ? (
                      <EyeSlash size={18} className="text-gray-500" />
                    ) : (
                      <Eye size={18} className="text-gray-500" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(job)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Edit"
                  >
                    <PencilSimple size={18} className="text-gray-500" />
                  </button>
                  <button
                    onClick={() => handleDelete(job.id)}
                    className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash size={18} className="text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!confirmAction}
        title={confirmAction?.title || ''}
        message={confirmAction?.message || ''}
        confirmText={confirmAction?.confirmText || 'Confirm'}
        variant={confirmAction?.variant || 'default'}
        onConfirm={async () => { await confirmAction?.onConfirm(); setConfirmAction(null); }}
        onClose={() => setConfirmAction(null)}
      />
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-600">&#x2715;</button>
        </div>
      )}
    </div>
  );
}
