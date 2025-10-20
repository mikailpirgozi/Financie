'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@finapp/ui';
import type { CategorizationRule } from '@finapp/core';

interface Rule {
  id: string;
  match_type: string;
  match_value: string;
  category_id: string;
  apply_to: string;
  created_at: string;
}

export function RulesManager() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    matchType: 'contains' as CategorizationRule['matchType'],
    matchValue: '',
    categoryId: '',
    applyTo: 'expense' as 'expense' | 'income',
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const response = await fetch('/api/rules');
      if (!response.ok) throw new Error('Failed to fetch rules');
      const data = await response.json();
      setRules(data);
    } catch (error) {
      console.error('Error fetching rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create rule');
      }

      await fetchRules();
      setShowForm(false);
      setFormData({
        matchType: 'contains',
        matchValue: '',
        categoryId: '',
        applyTo: 'expense',
      });
    } catch (error) {
      console.error('Error creating rule:', error);
      alert(error instanceof Error ? error.message : 'Failed to create rule');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const response = await fetch(`/api/rules/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete rule');

      await fetchRules();
    } catch (error) {
      console.error('Error deleting rule:', error);
      alert('Failed to delete rule');
    }
  };

  if (loading) {
    return <div>Loading rules...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Categorization Rules</CardTitle>
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : 'Add Rule'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4 mb-6 p-4 border rounded-lg">
              <div>
                <label className="block text-sm font-medium mb-2">Apply To</label>
                <select
                  value={formData.applyTo}
                  onChange={(e) =>
                    setFormData({ ...formData, applyTo: e.target.value as 'expense' | 'income' })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  required
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Match Type</label>
                <select
                  value={formData.matchType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      matchType: e.target.value as CategorizationRule['matchType'],
                    })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                  required
                >
                  <option value="contains">Contains</option>
                  <option value="exact">Exact Match</option>
                  <option value="starts_with">Starts With</option>
                  <option value="ends_with">Ends With</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Match Value</label>
                <input
                  type="text"
                  value={formData.matchValue}
                  onChange={(e) => setFormData({ ...formData, matchValue: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., grocery, restaurant"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Category ID</label>
                <input
                  type="text"
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Category UUID"
                  required
                />
              </div>

              <Button type="submit">Create Rule</Button>
            </form>
          )}

          {rules.length === 0 ? (
            <p className="text-gray-500">No rules defined yet. Add your first rule!</p>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {rule.apply_to}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                        {rule.match_type}
                      </span>
                    </div>
                    <p className="mt-2 font-medium">{rule.match_value}</p>
                    <p className="text-sm text-gray-500">Category: {rule.category_id}</p>
                  </div>
                  <Button variant="outline" onClick={() => handleDelete(rule.id)}>
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

