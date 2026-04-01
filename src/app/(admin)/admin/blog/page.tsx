'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  PencilSimple,
  Trash,
  Eye,
  EyeSlash,
  FloppyDisk,
  X,
  Article,
  MagnifyingGlass,
  ArrowLeft,
  Star,
  Image as ImageIcon,
  DotsThreeVertical,
} from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'framer-motion';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  author: string | null;
  tags: string | null;
  metaTitle: string | null;
  metaDesc: string | null;
  published: boolean;
  publishedAt: string | null;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    slug: '',
    title: '',
    excerpt: '',
    content: '',
    coverImage: '',
    author: '',
    tags: '',
    metaTitle: '',
    metaDesc: '',
    published: false,
    featured: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/admin/blog');
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingPost(null);
    setFormData({
      slug: '',
      title: '',
      excerpt: '',
      content: '',
      coverImage: '',
      author: '',
      tags: '',
      metaTitle: '',
      metaDesc: '',
      published: false,
      featured: false,
    });
  };

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    setIsCreating(false);
    setFormData({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt || '',
      content: post.content,
      coverImage: post.coverImage || '',
      author: post.author || '',
      tags: post.tags || '',
      metaTitle: post.metaTitle || '',
      metaDesc: post.metaDesc || '',
      published: post.published,
      featured: post.featured,
    });
  };

  const handleCancel = () => {
    setEditingPost(null);
    setIsCreating(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isCreating) {
        const res = await fetch('/api/admin/blog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || 'Failed to create post');
          return;
        }
      } else if (editingPost) {
        const res = await fetch(`/api/admin/blog/${editingPost.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || 'Failed to update post');
          return;
        }
      }
      await fetchPosts();
      handleCancel();
    } catch (error) {
      console.error('Error saving post:', error);
      alert('Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      await fetch(`/api/admin/blog/${id}`, { method: 'DELETE' });
      await fetchPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const togglePublish = async (post: BlogPost) => {
    try {
      await fetch(`/api/admin/blog/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !post.published }),
      });
      await fetchPosts();
    } catch (error) {
      console.error('Error toggling publish:', error);
    }
  };

  const toggleFeatured = async (post: BlogPost) => {
    try {
      await fetch(`/api/admin/blog/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: !post.featured }),
      });
      await fetchPosts();
    } catch (error) {
      console.error('Error toggling featured:', error);
    }
  };

  const filteredPosts = posts.filter(
    (post) =>
      post.title.toLowerCase().includes(search.toLowerCase()) ||
      post.slug.toLowerCase().includes(search.toLowerCase()) ||
      (post.tags && post.tags.toLowerCase().includes(search.toLowerCase()))
  );

  // Editor view
  if (editingPost || isCreating) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
                {isCreating ? 'Create Blog Post' : 'Edit Blog Post'}
              </h1>
              <p className="text-sm text-gray-500 truncate max-w-[200px] sm:max-w-none">
                {isCreating ? 'Write a new blog post' : `Editing: ${editingPost?.title}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button onClick={handleCancel} className="btn btn-secondary">
              <X size={18} />
              <span className="hidden sm:inline">Cancel</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !formData.title || !formData.slug}
              className="btn btn-primary"
            >
              <FloppyDisk size={18} />
              {saving ? 'Saving...' : <><span className="hidden sm:inline">Save Post</span><span className="sm:hidden">Save</span></>}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card p-6 space-y-4">
              <div className="form-field">
                <label className="form-label">Title</label>
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
                  placeholder="Post title"
                  className="input"
                />
              </div>

              <div className="form-field">
                <label className="form-label">Slug</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">/blog/</span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="post-slug"
                    className="input"
                  />
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">Excerpt</label>
                <textarea
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  placeholder="Brief summary of the post"
                  rows={3}
                  className="input"
                />
                <p className="form-helper">Short description shown in post listings</p>
              </div>

              <div className="form-field">
                <label className="form-label">Content</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Post content (supports Markdown)"
                  rows={20}
                  className="input font-mono text-sm"
                />
                <p className="form-helper">Supports Markdown formatting</p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="card p-6 space-y-4">
              <h3 className="font-medium text-gray-900">Publish</h3>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.published}
                  onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-[#ef6f2e] focus:ring-[#ef6f2e]"
                />
                <span className="text-sm text-gray-700">Publish this post</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-[#ef6f2e] focus:ring-[#ef6f2e]"
                />
                <span className="text-sm text-gray-700">Feature this post</span>
              </label>
            </div>

            <div className="card p-6 space-y-4">
              <h3 className="font-medium text-gray-900">Post Details</h3>
              <div className="form-field">
                <label className="form-label">Author</label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  placeholder="Author name"
                  className="input"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Tags</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="product, update, guide"
                  className="input"
                />
                <p className="form-helper">Comma-separated tags</p>
              </div>
              <div className="form-field">
                <label className="form-label">Cover Image URL</label>
                <input
                  type="text"
                  value={formData.coverImage}
                  onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                  placeholder="https://..."
                  className="input"
                />
              </div>
            </div>

            <div className="card p-6 space-y-4">
              <h3 className="font-medium text-gray-900">SEO Settings</h3>
              <div className="form-field">
                <label className="form-label">Meta Title</label>
                <input
                  type="text"
                  value={formData.metaTitle}
                  onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                  placeholder="SEO title (optional)"
                  className="input"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Meta Description</label>
                <textarea
                  value={formData.metaDesc}
                  onChange={(e) => setFormData({ ...formData, metaDesc: e.target.value })}
                  placeholder="SEO description (optional)"
                  rows={3}
                  className="input"
                />
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Blog Posts</h1>
          <p className="text-sm text-gray-500">Manage your blog content</p>
        </div>
        <button onClick={handleCreate} className="btn btn-primary w-fit">
          <Plus size={18} />
          Create Post
        </button>
      </div>

      {/* Search */}
      <div className="relative w-full sm:max-w-sm">
        <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search posts..."
          className="input input-with-icon w-full"
        />
      </div>

      {/* Posts List - Desktop */}
      <div className="card hidden sm:block">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading posts...</div>
        ) : filteredPosts.length === 0 ? (
          <div className="p-8 text-center">
            <Article size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 mb-4">
              {search ? 'No posts match your search' : 'No blog posts yet'}
            </p>
            {!search && (
              <button onClick={handleCreate} className="btn btn-primary">
                <Plus size={18} />
                Create your first post
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredPosts.map((post) => (
              <div key={post.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  {post.coverImage ? (
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="w-16 h-12 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-16 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                      <ImageIcon size={20} className="text-gray-400" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{post.title}</h3>
                      {post.featured && (
                        <Star size={14} weight="fill" className="text-yellow-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      /blog/{post.slug}
                      {post.author && <span className="ml-2">by {post.author}</span>}
                    </p>
                    {post.tags && (
                      <div className="flex gap-1 mt-1">
                        {post.tags.split(',').slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
                          >
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`badge ${post.published ? 'badge-accent' : 'badge-warning'}`}
                  >
                    {post.published ? 'Published' : 'Draft'}
                  </span>
                  <button
                    onClick={() => toggleFeatured(post)}
                    className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${
                      post.featured ? 'text-yellow-500' : 'text-gray-400'
                    }`}
                    title={post.featured ? 'Unfeature' : 'Feature'}
                  >
                    <Star size={18} weight={post.featured ? 'fill' : 'regular'} />
                  </button>
                  <button
                    onClick={() => togglePublish(post)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title={post.published ? 'Unpublish' : 'Publish'}
                  >
                    {post.published ? (
                      <EyeSlash size={18} className="text-gray-500" />
                    ) : (
                      <Eye size={18} className="text-gray-500" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(post)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Edit"
                  >
                    <PencilSimple size={18} className="text-gray-500" />
                  </button>
                  <button
                    onClick={() => handleDelete(post.id)}
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

      {/* Posts List - Mobile */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          <div className="card p-8 text-center text-gray-500">Loading posts...</div>
        ) : filteredPosts.length === 0 ? (
          <div className="card p-8 text-center">
            <Article size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 mb-4">
              {search ? 'No posts match your search' : 'No blog posts yet'}
            </p>
            {!search && (
              <button onClick={handleCreate} className="btn btn-primary">
                <Plus size={18} />
                Create your first post
              </button>
            )}
          </div>
        ) : (
          filteredPosts.map((post) => (
            <div key={post.id} className="card p-4">
              <div className="flex items-start gap-3">
                {post.coverImage ? (
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    className="w-16 h-12 object-cover rounded-lg flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <ImageIcon size={20} className="text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-gray-900 truncate">{post.title}</h3>
                    {post.featured && (
                      <Star size={14} weight="fill" className="text-yellow-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">/blog/{post.slug}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`badge text-xs ${post.published ? 'badge-accent' : 'badge-warning'}`}
                    >
                      {post.published ? 'Published' : 'Draft'}
                    </span>
                    {post.author && (
                      <span className="text-xs text-gray-500">by {post.author}</span>
                    )}
                  </div>
                </div>
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setMenuOpenId(menuOpenId === post.id ? null : post.id)}
                    className="p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100"
                  >
                    <DotsThreeVertical size={20} />
                  </button>
                  <AnimatePresence>
                    {menuOpenId === post.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setMenuOpenId(null)}
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1"
                        >
                          <button
                            onClick={() => { handleEdit(post); setMenuOpenId(null); }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <PencilSimple size={16} />
                            Edit
                          </button>
                          <button
                            onClick={() => { togglePublish(post); setMenuOpenId(null); }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            {post.published ? <EyeSlash size={16} /> : <Eye size={16} />}
                            {post.published ? 'Unpublish' : 'Publish'}
                          </button>
                          <button
                            onClick={() => { toggleFeatured(post); setMenuOpenId(null); }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <Star size={16} weight={post.featured ? 'fill' : 'regular'} />
                            {post.featured ? 'Unfeature' : 'Feature'}
                          </button>
                          <button
                            onClick={() => { handleDelete(post.id); setMenuOpenId(null); }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash size={16} />
                            Delete
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
