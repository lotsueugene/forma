'use client';

import { useEffect, useState } from 'react';
import {
  Plus,
  Spinner,
  Trash,
  PencilSimple,
  Lightning,
  Crown,
  Buildings,
  Star,
  Check,
  X,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface Feature {
  text: string;
  included: boolean;
}

interface PricingPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  icon: string;
  popular: boolean;
  ctaText: string;
  ctaLink: string | null;
  features: Feature[];
  sortOrder: number;
  active: boolean;
  createdAt: string;
}

const iconOptions = [
  { value: 'Lightning', icon: Lightning },
  { value: 'Crown', icon: Crown },
  { value: 'Buildings', icon: Buildings },
  { value: 'Star', icon: Star },
];

const getIconComponent = (iconName: string) => {
  const found = iconOptions.find(opt => opt.value === iconName);
  return found ? found.icon : Lightning;
};

export default function AdminPricingPage() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
  const [saving, setSaving] = useState(false);

  const emptyFormData = {
    name: '',
    slug: '',
    description: '',
    monthlyPrice: '',
    yearlyPrice: '',
    icon: 'Lightning',
    popular: false,
    ctaText: 'Get Started',
    ctaLink: '',
    features: [{ text: '', included: true }],
    sortOrder: 0,
    active: true,
  };

  const [formData, setFormData] = useState(emptyFormData);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/pricing');
      const data = await res.json();
      const parsedPlans = (data.plans || []).map((plan: PricingPlan & { features: string | Feature[] }) => ({
        ...plan,
        features: typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features,
      }));
      setPlans(parsedPlans);
    } catch (error) {
      console.error('Failed to load pricing plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditingPlan(null);
    setFormData(emptyFormData);
    setShowForm(true);
  };

  const openEditForm = (plan: PricingPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      slug: plan.slug,
      description: plan.description,
      monthlyPrice: plan.monthlyPrice !== null ? String(plan.monthlyPrice) : '',
      yearlyPrice: plan.yearlyPrice !== null ? String(plan.yearlyPrice) : '',
      icon: plan.icon,
      popular: plan.popular,
      ctaText: plan.ctaText,
      ctaLink: plan.ctaLink || '',
      features: plan.features.length > 0 ? plan.features : [{ text: '', included: true }],
      sortOrder: plan.sortOrder,
      active: plan.active,
    });
    setShowForm(true);
  };

  const savePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: formData.name,
      slug: formData.slug,
      description: formData.description,
      monthlyPrice: formData.monthlyPrice ? parseInt(formData.monthlyPrice) : null,
      yearlyPrice: formData.yearlyPrice ? parseInt(formData.yearlyPrice) : null,
      icon: formData.icon,
      popular: formData.popular,
      ctaText: formData.ctaText,
      ctaLink: formData.ctaLink || null,
      features: formData.features.filter(f => f.text.trim()),
      sortOrder: formData.sortOrder,
      active: formData.active,
    };

    try {
      const url = editingPlan
        ? `/api/admin/pricing/${editingPlan.id}`
        : '/api/admin/pricing';
      const method = editingPlan ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowForm(false);
        setEditingPlan(null);
        setFormData(emptyFormData);
        loadPlans();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to save plan');
      }
    } catch (error) {
      console.error('Failed to save plan:', error);
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pricing plan?')) return;

    try {
      const res = await fetch(`/api/admin/pricing/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setPlans(plans.filter(p => p.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete plan:', error);
    }
  };

  const addFeature = () => {
    setFormData({
      ...formData,
      features: [...formData.features, { text: '', included: true }],
    });
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index),
    });
  };

  const updateFeature = (index: number, field: 'text' | 'included', value: string | boolean) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = { ...newFeatures[index], [field]: value };
    setFormData({ ...formData, features: newFeatures });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Pricing Plans</h1>
          <p className="text-gray-500">Manage pricing plans displayed on the landing page</p>
        </div>
        <button onClick={openCreateForm} className="btn btn-primary">
          <Plus size={16} />
          New Plan
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <form onSubmit={savePlan} className="card p-5 space-y-4 bg-white border border-gray-200 rounded-xl">
          <h2 className="font-semibold text-gray-900">
            {editingPlan ? 'Edit Plan' : 'Create Plan'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input w-full"
                placeholder="e.g., Pro"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                className="input w-full"
                placeholder="e.g., pro"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Icon</label>
              <select
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="input w-full"
              >
                {iconOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.value}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input w-full"
              placeholder="e.g., For growing teams and businesses"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Monthly Price ($)</label>
              <input
                type="number"
                value={formData.monthlyPrice}
                onChange={(e) => setFormData({ ...formData, monthlyPrice: e.target.value })}
                className="input w-full"
                placeholder="Leave empty for 'Custom'"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Yearly Price ($/month)</label>
              <input
                type="number"
                value={formData.yearlyPrice}
                onChange={(e) => setFormData({ ...formData, yearlyPrice: e.target.value })}
                className="input w-full"
                placeholder="Leave empty for 'Custom'"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">CTA Text</label>
              <input
                type="text"
                value={formData.ctaText}
                onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                className="input w-full"
                placeholder="e.g., Start Trial"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Sort Order</label>
              <input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                className="input w-full"
              />
            </div>
          </div>

          {/* Features */}
          <div>
            <label className="block text-sm text-gray-600 mb-2">Features</label>
            <div className="space-y-2">
              {formData.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={feature.text}
                    onChange={(e) => updateFeature(index, 'text', e.target.value)}
                    className="input flex-1"
                    placeholder="e.g., Unlimited forms"
                  />
                  <label className="flex items-center gap-1 text-sm text-gray-600 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={feature.included}
                      onChange={(e) => updateFeature(index, 'included', e.target.checked)}
                    />
                    Included
                  </label>
                  <button
                    type="button"
                    onClick={() => removeFeature(index)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addFeature}
              className="mt-2 text-sm text-[#ef6f2e] hover:text-[#ef6f2e]/80 flex items-center gap-1"
            >
              <Plus size={14} />
              Add Feature
            </button>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={formData.popular}
                onChange={(e) => setFormData({ ...formData, popular: e.target.checked })}
              />
              Mark as Popular
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              />
              Active (visible on landing page)
            </label>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <Spinner size={16} className="animate-spin" /> : <Check size={16} />}
              {editingPlan ? 'Update Plan' : 'Create Plan'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingPlan(null);
              }}
              className="btn btn-ghost"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Plans List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size={24} className="animate-spin text-gray-500" />
          </div>
        ) : plans.length === 0 ? (
          <div className="card p-8 text-center bg-white border border-gray-200 rounded-xl">
            <Lightning size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No pricing plans yet</h3>
            <p className="text-gray-500 mb-4">Create your first pricing plan to display on the landing page.</p>
            <button onClick={openCreateForm} className="btn btn-primary">
              <Plus size={16} />
              Create First Plan
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const IconComponent = getIconComponent(plan.icon);

              return (
                <div
                  key={plan.id}
                  className={cn(
                    'card p-5 bg-white border rounded-xl relative',
                    plan.popular ? 'border-[#ef6f2e]/30' : 'border-gray-200',
                    !plan.active && 'opacity-60'
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                      <span className="px-2 py-0.5 rounded bg-[#ef6f2e] text-white text-xs uppercase">
                        Popular
                      </span>
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        plan.popular ? 'bg-[#ef6f2e]/10' : 'bg-gray-100'
                      )}>
                        <IconComponent
                          size={18}
                          className={plan.popular ? 'text-[#ef6f2e]' : 'text-gray-600'}
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                        <p className="text-xs text-gray-500">{plan.slug}</p>
                      </div>
                    </div>
                    {!plan.active && (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-600">
                        Inactive
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-4">{plan.description}</p>

                  <div className="mb-4">
                    {plan.monthlyPrice !== null ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-gray-900">${plan.yearlyPrice || plan.monthlyPrice}</span>
                        <span className="text-sm text-gray-500">/month</span>
                      </div>
                    ) : (
                      <div className="text-2xl font-bold text-gray-900">Custom</div>
                    )}
                  </div>

                  <div className="space-y-1.5 mb-4">
                    {plan.features.slice(0, 4).map((feature, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        {feature.included ? (
                          <Check size={14} className="text-[#ef6f2e]" />
                        ) : (
                          <X size={14} className="text-gray-300" />
                        )}
                        <span className={feature.included ? 'text-gray-700' : 'text-gray-400'}>
                          {feature.text}
                        </span>
                      </div>
                    ))}
                    {plan.features.length > 4 && (
                      <p className="text-xs text-gray-500">+{plan.features.length - 4} more features</p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => openEditForm(plan)}
                      className="flex-1 btn btn-secondary text-sm py-2"
                    >
                      <PencilSimple size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => deletePlan(plan.id)}
                      className="btn btn-ghost text-red-500 text-sm py-2"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
