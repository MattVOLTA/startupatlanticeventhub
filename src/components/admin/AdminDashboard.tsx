import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { OrganizationList } from './OrganizationList';
import { OrganizationForm } from './OrganizationForm';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { Logo } from '../Logo';
import { Plus, LogOut } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  eventbrite_id: string;
  created_at: string;
}

export function AdminDashboard() {
  const { user, signOut } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [deletingOrg, setDeletingOrg] = useState<Organization | null>(null);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  async function fetchOrganizations() {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('name');

      if (error) throw error;

      setOrganizations(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch organizations');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateOrUpdate(data: { name: string; eventbrite_id: string }) {
    if (editingOrg) {
      // Update existing organization
      const { error } = await supabase
        .from('organizations')
        .update(data)
        .eq('id', editingOrg.id);

      if (error) throw error;
    } else {
      // Create new organization
      const { error } = await supabase
        .from('organizations')
        .insert([data]);

      if (error) throw error;
    }

    await fetchOrganizations();
    setShowForm(false);
    setEditingOrg(null);
  }

  async function handleDelete() {
    if (!deletingOrg) return;

    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', deletingOrg.id);

      if (error) throw error;

      await fetchOrganizations();
      setDeletingOrg(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete organization');
    }
  }

  function handleEdit(org: Organization) {
    setEditingOrg(org);
    setShowForm(true);
  }

  function handleAdd() {
    setEditingOrg(null);
    setShowForm(true);
  }

  return (
    <div className="min-h-screen bg-ocean">
      {/* Header */}
      <header className="bg-ocean shadow-lg border-b border-sky/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Logo className="h-8 w-auto" />
              <h1 className="text-2xl font-display font-bold text-white pt-[13px]">Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-white/80">{user?.email}</span>
              <button
                onClick={signOut}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-sky/20 border border-sky/40 rounded-md hover:bg-sky/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-netting"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-display font-bold text-ocean">Organizations</h2>
                <button
                  onClick={handleAdd}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-kitchen border border-transparent rounded-md hover:bg-kitchen/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-kitchen"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Organization
                </button>
              </div>

              {error && (
                <div className="mb-4 bg-rock/10 border border-rock/30 text-rock px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-netting"></div>
                </div>
              ) : (
                <OrganizationList
                  organizations={organizations}
                  onEdit={handleEdit}
                  onDelete={setDeletingOrg}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      {showForm && (
        <OrganizationForm
          organization={editingOrg || undefined}
          onSubmit={handleCreateOrUpdate}
          onCancel={() => {
            setShowForm(false);
            setEditingOrg(null);
          }}
        />
      )}

      {deletingOrg && (
        <DeleteConfirmDialog
          organizationName={deletingOrg.name}
          onConfirm={handleDelete}
          onCancel={() => setDeletingOrg(null)}
        />
      )}
    </div>
  );
}