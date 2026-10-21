import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Modal } from '../components/ui/Modal.js';
import { Badge } from '../components/ui/Badge.js';
import {
  Upload,
  Download,
  Plus,
  Search,
  Trash2,
  Users,
  CheckCircle2,
  AlertTriangle,
  FolderPlus,
} from 'lucide-react';

export function ContactsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [page, setPage] = useState(1);

  // Modals state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isNewListOpen, setIsNewListOpen] = useState(false);

  // CSV Import State
  const [csvContent, setCsvContent] = useState('');
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [previewData, setPreviewData] = useState<any>(null);
  const [mapping, setMapping] = useState<any>({ email: '', customFieldColumns: {} });
  const [importResult, setImportResult] = useState<any>(null);
  const [targetListId, setTargetListId] = useState<string>('');

  // Single Contact Add State
  const [newEmail, setNewEmail] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newGithub, setNewGithub] = useState('');

  // New List State
  const [listName, setListName] = useState('');
  const [listDesc, setListDesc] = useState('');

  // Fetch contacts
  const { data: contactsData, isLoading, isError: contactsError, error: contactsQueryError, refetch } = useQuery({
    queryKey: ['contacts', page, search, selectedListId],
    queryFn: () =>
      api.get<any>(
        `/contacts?page=${page}&limit=20&search=${encodeURIComponent(search)}${
          selectedListId ? `&listId=${selectedListId}` : ''
        }`
      ),
  });

  // Fetch lists
  const { data: listsData, isError: listsError, error: listsQueryError } = useQuery({
    queryKey: ['contact-lists'],
    queryFn: () => api.get<{ lists: any[] }>('/contacts/lists/all'),
  });

  // Preview CSV mutation
  const previewMutation = useMutation({
    mutationFn: (content: string) => api.post<any>('/contacts/import/preview', { csvContent: content }),
    onSuccess: (data) => {
      setPreviewData(data);
      setMapping(data.suggestedMapping);
      setImportStep(2);
    },
  });

  // Execute Import mutation
  const importMutation = useMutation({
    mutationFn: () =>
      api.post<any>('/contacts/import', {
        csvContent,
        mapping,
        targetListId: targetListId || null,
        skipDuplicates: true,
      }),
    onSuccess: (data) => {
      setImportResult(data);
      setImportStep(3);
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact-lists'] });
    },
  });

  // Add Contact mutation
  const addContactMutation = useMutation({
    mutationFn: () =>
      api.post('/contacts', {
        email: newEmail,
        firstName: newFirstName || null,
        lastName: newLastName || null,
        customFields: {
          ...(newCompany ? { company: newCompany } : {}),
          ...(newGithub ? { github_username: newGithub } : {}),
        },
        listIds: targetListId ? [targetListId] : [],
      }),
    onSuccess: () => {
      setIsAddOpen(false);
      setNewEmail('');
      setNewFirstName('');
      setNewLastName('');
      setNewCompany('');
      setNewGithub('');
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  // Create List mutation
  const createListMutation = useMutation({
    mutationFn: () =>
      api.post('/contacts/lists', {
        name: listName,
        description: listDesc || null,
      }),
    onSuccess: () => {
      setIsNewListOpen(false);
      setListName('');
      setListDesc('');
      queryClient.invalidateQueries({ queryKey: ['contact-lists'] });
    },
  });

  // Delete contact
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/contacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      previewMutation.mutate(text);
    };
    reader.readAsText(file);
  };

  const handleExportCsv = () => {
    window.location.href = `/api/contacts/export${selectedListId ? `?listId=${selectedListId}` : ''}`;
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Contacts & Lists</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage recipients, map spreadsheet headers, and organize audience segments.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" icon={<Download className="w-4 h-4" />} onClick={handleExportCsv}>
            Export CSV
          </Button>
          <Button
            variant="outline"
            icon={<Upload className="w-4 h-4" />}
            onClick={() => {
              setImportStep(1);
              setCsvContent('');
              setPreviewData(null);
              setImportResult(null);
              setIsImportOpen(true);
            }}
          >
            Import CSV
          </Button>
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setIsAddOpen(true)}>
            Add Contact
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={selectedListId}
            onChange={(e) => {
              setSelectedListId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Contact Lists</option>
            {listsData?.lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.memberCount} contacts)
              </option>
            ))}
          </select>

          <Button
            size="sm"
            variant="ghost"
            icon={<FolderPlus className="w-4 h-4" />}
            onClick={() => setIsNewListOpen(true)}
            title="Create Contact List"
          >
            New List
          </Button>
        </div>
      </Card>

      {/* Contacts Table */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading contacts...</div>
        ) : contactsError ? (
          <div className="p-12 text-center">
            <AlertTriangle className="w-10 h-10 text-rose-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">Unable to load contacts</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {contactsQueryError instanceof Error
                ? contactsQueryError.message
                : 'The contacts service returned an unexpected error.'}
            </p>
            <Button className="mt-4" size="sm" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        ) : listsError ? (
          <div className="p-12 text-center">
            <AlertTriangle className="w-10 h-10 text-rose-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">Unable to load contact lists</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {listsQueryError instanceof Error
                ? listsQueryError.message
                : 'The contact lists service returned an unexpected error.'}
            </p>
          </div>
        ) : contactsData?.contacts && contactsData.contacts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3 font-semibold">Recipient</th>
                  <th className="px-6 py-3 font-semibold">Name</th>
                  <th className="px-6 py-3 font-semibold">Company / Org</th>
                  <th className="px-6 py-3 font-semibold">GitHub</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contactsData.contacts.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-slate-900">{c.email}</td>
                    <td className="px-6 py-3.5 text-slate-600">{c.name || '—'}</td>
                    <td className="px-6 py-3.5 text-slate-600">{c.customFields?.company || '—'}</td>
                    <td className="px-6 py-3.5 text-slate-600">
                      {c.customFields?.github_username ? `@${c.customFields.github_username}` : '—'}
                    </td>
                    <td className="px-6 py-3.5">
                      {c.isSuppressed ? (
                        <Badge status="revoked">Suppressed / Opted Out</Badge>
                      ) : (
                        <Badge status="completed">Eligible</Badge>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => {
                          if (confirm(`Delete contact ${c.email}?`)) {
                            deleteMutation.mutate(c.id);
                          }
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                        title="Delete contact"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination footer */}
            <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {contactsData.contacts.length} of {contactsData.total} contacts
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span className="px-2">
                  Page {page} of {contactsData.totalPages || 1}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= contactsData.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No contacts found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Import a CSV spreadsheet of your recipients or add contacts manually to begin building campaigns.
            </p>
            <Button
              className="mt-4"
              size="sm"
              icon={<Upload className="w-4 h-4" />}
              onClick={() => setIsImportOpen(true)}
            >
              Import CSV File
            </Button>
          </div>
        )}
      </Card>

      {/* CSV Import Modal */}
      <Modal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Import Contacts from CSV"
        description="Upload a CSV file and map spreadsheet columns to recipient fields."
        maxWidth="xl"
      >
        {importStep === 1 && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-emerald-500 transition-colors">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">Choose a CSV file from your computer</p>
              <p className="text-xs text-slate-400 mt-0.5">Supports comma-separated .csv files</p>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="mt-4 block mx-auto text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Or paste CSV contents directly:
              </label>
              <textarea
                rows={5}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="email,first_name,last_name,company&#10;jane@acme.com,Jane,Doe,Acme Corp&#10;alex@example.org,Alex,Smith,OpenSource"
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setIsImportOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={!csvContent.trim()}
                isLoading={previewMutation.isPending}
                onClick={() => previewMutation.mutate(csvContent)}
              >
                Inspect & Map Columns
              </Button>
            </div>
          </div>
        )}

        {importStep === 2 && previewData && (
          <div className="space-y-5">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs flex justify-between items-center">
              <span>Detected {previewData.totalRows} row(s) in uploaded file.</span>
              <span className="text-emerald-700 font-semibold">
                {previewData.previewRows.filter((r: any) => r.isValid).length} valid in preview
              </span>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Column Mapping
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Email (Required)*</label>
                  <select
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                    value={mapping.email}
                    onChange={(e) => setMapping({ ...mapping, email: e.target.value })}
                  >
                    <option value="">Select column...</option>
                    {previewData.headers.map((h: string) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">First Name</label>
                  <select
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                    value={mapping.firstName || ''}
                    onChange={(e) => setMapping({ ...mapping, firstName: e.target.value })}
                  >
                    <option value="">(None / Optional)</option>
                    {previewData.headers.map((h: string) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Last Name</label>
                  <select
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                    value={mapping.lastName || ''}
                    onChange={(e) => setMapping({ ...mapping, lastName: e.target.value })}
                  >
                    <option value="">(None / Optional)</option>
                    {previewData.headers.map((h: string) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Company</label>
                  <select
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                    value={mapping.company || ''}
                    onChange={(e) => setMapping({ ...mapping, company: e.target.value })}
                  >
                    <option value="">(None / Optional)</option>
                    {previewData.headers.map((h: string) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Target List Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Assign to Contact List (Optional)
              </label>
              <select
                className="w-full rounded-lg border border-slate-300 p-2 text-xs"
                value={targetListId}
                onChange={(e) => setTargetListId(e.target.value)}
              >
                <option value="">Do not assign to list</option>
                {listsData?.lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sample preview validation rows */}
            <div>
              <h5 className="text-xs font-semibold text-slate-600 mb-1">Preview Row Validation:</h5>
              <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg text-[11px] divide-y divide-slate-100">
                {previewData.previewRows.slice(0, 5).map((row: any) => (
                  <div key={row.rowIndex} className="p-2 flex items-center justify-between">
                    <span className="font-mono">{row.raw[mapping.email || previewData.headers[0]] || '(Empty)'}</span>
                    {row.isValid ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                      </span>
                    ) : (
                      <span className="text-rose-600 flex items-center gap-1" title={row.errors.join(', ')}>
                        <AlertTriangle className="w-3.5 h-3.5" /> {row.errors[0]}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button variant="outline" size="sm" onClick={() => setImportStep(1)}>
                Back
              </Button>
              <Button
                disabled={!mapping.email}
                isLoading={importMutation.isPending}
                onClick={() => importMutation.mutate()}
              >
                Complete Import
              </Button>
            </div>
          </div>
        )}

        {importStep === 3 && importResult && (
          <div className="space-y-4 text-center py-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900">Import Finished</h4>
            <div className="grid grid-cols-2 gap-3 text-left max-w-sm mx-auto text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>Total Rows:</div>
              <div className="font-bold">{importResult.totalRows}</div>
              <div>Imported:</div>
              <div className="font-bold text-emerald-600">{importResult.successfullyImported}</div>
              <div>Duplicate Rows:</div>
              <div className="font-bold text-slate-600">{importResult.duplicateRecords}</div>
              <div>Invalid Addresses:</div>
              <div className="font-bold text-rose-600">{importResult.invalidAddresses}</div>
              <div>Suppressed / Opted Out:</div>
              <div className="font-bold text-amber-600">{importResult.suppressedAddresses}</div>
            </div>
            <Button className="mt-4" onClick={() => setIsImportOpen(false)}>
              Done
            </Button>
          </div>
        )}
      </Modal>

      {/* Add Single Contact Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Recipient"
        description="Add a contact manually to your directory."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addContactMutation.mutate();
          }}
          className="space-y-3"
        >
          <Input
            label="Email Address *"
            type="email"
            required
            placeholder="recipient@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              placeholder="Jane"
              value={newFirstName}
              onChange={(e) => setNewFirstName(e.target.value)}
            />
            <Input
              label="Last Name"
              placeholder="Doe"
              value={newLastName}
              onChange={(e) => setNewLastName(e.target.value)}
            />
          </div>
          <Input
            label="Company"
            placeholder="Acme Corp"
            value={newCompany}
            onChange={(e) => setNewCompany(e.target.value)}
          />
          <Input
            label="GitHub Username"
            placeholder="octocat"
            value={newGithub}
            onChange={(e) => setNewGithub(e.target.value)}
          />

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Add to List</label>
            <select
              className="w-full rounded-lg border border-slate-300 p-2 text-xs"
              value={targetListId}
              onChange={(e) => setTargetListId(e.target.value)}
            >
              <option value="">No list (general directory only)</option>
              {listsData?.lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={addContactMutation.isPending}>
              Save Contact
            </Button>
          </div>
        </form>
      </Modal>

      {/* New List Modal */}
      <Modal
        isOpen={isNewListOpen}
        onClose={() => setIsNewListOpen(false)}
        title="Create Contact List"
        description="Organize your contacts into targeted groups."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createListMutation.mutate();
          }}
          className="space-y-3"
        >
          <Input
            label="List Name *"
            required
            placeholder="e.g. Open Source Contributors"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
          />
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Description (Optional)</label>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-emerald-500"
              placeholder="Community members who contributed to repositories in Q3"
              value={listDesc}
              onChange={(e) => setListDesc(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="ghost" onClick={() => setIsNewListOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createListMutation.isPending}>
              Create List
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
