import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Modal } from '../components/ui/Modal.js';
import {
  FileText,
  Plus,
  Trash2,
  Copy,
  Eye,
  Code2,
  Sparkles,
} from 'lucide-react';
import { renderMergeText } from '@bizletix/shared';

const COMMON_MERGE_VARS = [
  { label: 'First Name', tag: '{{first_name}}' },
  { label: 'Last Name', tag: '{{last_name}}' },
  { label: 'Full Name', tag: '{{name}}' },
  { label: 'Email', tag: '{{email}}' },
  { label: 'Company', tag: '{{company}}' },
  { label: 'GitHub', tag: '{{github_username}}' },
];

export function TemplatesPage() {
  const queryClient = useQueryClient();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [textBody, setTextBody] = useState('');
  const [editorTab, setEditorTab] = useState<'html' | 'text' | 'preview'>('html');

  // Fetch templates
  const { data: templatesData, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get<{ templates: any[] }>('/templates'),
  });

  // Save template mutation
  const saveMutation = useMutation({
    mutationFn: () => {
      if (editingTemplateId) {
        return api.patch(`/templates/${editingTemplateId}`, {
          name,
          subject,
          htmlBody,
          textBody: textBody || undefined,
        });
      }
      return api.post('/templates', {
        name,
        subject,
        htmlBody,
        textBody: textBody || undefined,
      });
    },
    onSuccess: () => {
      setIsEditorOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  const resetForm = () => {
    setEditingTemplateId(null);
    setName('');
    setSubject('');
    setHtmlBody('');
    setTextBody('');
    setEditorTab('html');
  };

  const openNew = () => {
    resetForm();
    setName('New Announcement');
    setSubject('Update for {{first_name}}');
    setHtmlBody(
      `<p>Hi {{first_name}},</p>\n<p>Thanks for being a valued part of our community at {{company}}.</p>\n<p>We wanted to share an exciting update with you...</p>\n<p>Best regards,<br>The Team</p>`
    );
    setIsEditorOpen(true);
  };

  const openEdit = (t: any) => {
    setEditingTemplateId(t.id);
    setName(t.name);
    setSubject(t.subject);
    setHtmlBody(t.htmlBody);
    setTextBody(t.textBody || '');
    setIsEditorOpen(true);
  };

  const insertVariable = (tag: string) => {
    if (editorTab === 'html') {
      setHtmlBody((prev) => prev + tag);
    } else if (editorTab === 'text') {
      setTextBody((prev) => prev + tag);
    }
  };

  const samplePreviewData = {
    email: 'alex@example.org',
    first_name: 'Alex',
    last_name: 'Rivera',
    name: 'Alex Rivera',
    company: 'Acme Technologies',
    github_username: 'alexr',
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Email Templates</h1>
          <p className="text-sm text-slate-500 mt-1">
            Design reusable message layouts with dynamic merge variables and real-time previews.
          </p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={openNew}>
          Create Template
        </Button>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="p-8 text-center text-slate-400">Loading templates...</div>
      ) : templatesData?.templates && templatesData.templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templatesData.templates.map((t) => (
            <Card key={t.id} className="flex flex-col justify-between hover:border-slate-300 transition-colors">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                    <h3 className="font-semibold text-slate-900 text-sm">{t.name}</h3>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2 font-mono bg-slate-50 p-2 rounded border border-slate-100 truncate">
                  {t.subject}
                </p>

                {t.mergeVariables && t.mergeVariables.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {t.mergeVariables.map((v: string) => (
                      <span
                        key={v}
                        className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-mono"
                      >
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {new Date(t.updatedAt).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                    Edit
                  </Button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete template "${t.name}"?`)) {
                        deleteMutation.mutate(t.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                    title="Delete template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No templates created yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Build personalized templates with merge variables to reuse across campaigns.
          </p>
          <Button className="mt-4" size="sm" icon={<Plus className="w-4 h-4" />} onClick={openNew}>
            Create First Template
          </Button>
        </Card>
      )}

      {/* Template Editor Modal */}
      <Modal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title={editingTemplateId ? 'Edit Template' : 'Create Template'}
        description="Compose subject and content. Use double braces for variables like {{first_name}}."
        maxWidth="2xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Template Name *"
              required
              placeholder="e.g. Contributor Welcome"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="Subject Line *"
              required
              placeholder="Hi {{first_name}}, welcome to Bizletix"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Merge Variables Quick Insertion Bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Insert Merge Variable:
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_MERGE_VARS.map((v) => (
                <button
                  key={v.tag}
                  type="button"
                  onClick={() => insertVariable(v.tag)}
                  className="px-2 py-1 rounded bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 text-xs font-mono transition-colors border border-slate-200"
                >
                  {v.tag}
                </button>
              ))}
            </div>
          </div>

          {/* Editor Tabs: HTML, Plain Text, Preview */}
          <div>
            <div className="flex border-b border-slate-200 gap-4 mb-2">
              <button
                type="button"
                onClick={() => setEditorTab('html')}
                className={`pb-2 text-xs font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
                  editorTab === 'html'
                    ? 'border-emerald-600 text-emerald-700 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" /> HTML Body
              </button>
              <button
                type="button"
                onClick={() => setEditorTab('text')}
                className={`pb-2 text-xs font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
                  editorTab === 'text'
                    ? 'border-emerald-600 text-emerald-700 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Copy className="w-3.5 h-3.5" /> Plain Text Fallback
              </button>
              <button
                type="button"
                onClick={() => setEditorTab('preview')}
                className={`pb-2 text-xs font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
                  editorTab === 'preview'
                    ? 'border-emerald-600 text-emerald-700 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Eye className="w-3.5 h-3.5" /> Live Preview
              </button>
            </div>

            {editorTab === 'html' && (
              <textarea
                rows={9}
                required
                className="w-full rounded-lg border border-slate-300 p-3 text-xs font-mono focus:ring-2 focus:ring-emerald-500"
                placeholder="<p>Hello {{first_name}},</p><p>We have exciting news...</p>"
                value={htmlBody}
                onChange={(e) => setHtmlBody(e.target.value)}
              />
            )}

            {editorTab === 'text' && (
              <textarea
                rows={9}
                className="w-full rounded-lg border border-slate-300 p-3 text-xs font-mono focus:ring-2 focus:ring-emerald-500"
                placeholder="Hello {{first_name}},\n\nWe have exciting news..."
                value={textBody}
                onChange={(e) => setTextBody(e.target.value)}
              />
            )}

            {editorTab === 'preview' && (
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
                <div className="text-xs">
                  <span className="font-semibold text-slate-700">Preview Subject: </span>
                  <span className="text-slate-900 font-medium">
                    {renderMergeText(subject, samplePreviewData)}
                  </span>
                </div>
                <div
                  className="bg-white p-4 rounded border border-slate-200 text-sm prose prose-sm max-w-none min-h-[140px]"
                  dangerouslySetInnerHTML={{
                    __html: renderMergeText(htmlBody, samplePreviewData, { escapeForHtml: false }),
                  }}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={() => setIsEditorOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saveMutation.isPending}>
              {editingTemplateId ? 'Save Changes' : 'Create Template'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
