import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Modal } from '../components/ui/Modal.js';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Mail,
  Users,
  Eye,
  Shield,
  Send,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export function NewCampaignPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form State
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [senderConnectionId, setSenderConnectionId] = useState<string>('');
  const [templateId, setTemplateId] = useState<string>('');
  const [htmlBody, setHtmlBody] = useState('<p>Hello {{first_name}},</p><p>We wanted to reach out regarding {{company}}.</p>');
  const [textBody, setTextBody] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [trackingOpenEnabled, setTrackingOpenEnabled] = useState(true);
  const [trackingClickEnabled, setTrackingClickEnabled] = useState(true);
  const [includeUnsubscribe, setIncludeUnsubscribe] = useState(true);

  // Personalization Previews State
  const [previews, setPreviews] = useState<any[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  // Test send modal
  const [isTestSendOpen, setIsTestSendOpen] = useState(false);
  const [testRecipientEmail, setTestRecipientEmail] = useState('');
  const [testSendSuccess, setTestSendSuccess] = useState<string | null>(null);

  // Queries
  const { data: connectionData } = useQuery({
    queryKey: ['google-connection-status'],
    queryFn: () => api.get<{ connection: any }>('/integrations/google/status'),
  });

  const { data: listsData } = useQuery({
    queryKey: ['contact-lists'],
    queryFn: () => api.get<{ lists: any[] }>('/contacts/lists/all'),
  });

  const { data: templatesData } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get<{ templates: any[] }>('/templates'),
  });

  // Pre-select sender connection if available
  useEffect(() => {
    if (connectionData?.connection?.id && !senderConnectionId) {
      setSenderConnectionId(connectionData.connection.id);
    }
  }, [connectionData, senderConnectionId]);

  // Load template content when chosen
  useEffect(() => {
    if (templateId && templatesData?.templates) {
      const found = templatesData.templates.find((t) => t.id === templateId);
      if (found) {
        setSubject(found.subject);
        setHtmlBody(found.htmlBody);
        setTextBody(found.textBody || '');
      }
    }
  }, [templateId, templatesData]);

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: () =>
      api.post<any>('/campaigns/preview', {
        subject,
        htmlBody,
        textBody,
        listId: selectedListIds[0] || undefined,
      }),
    onSuccess: (data) => {
      setPreviews(data.previews || []);
      setPreviewIndex(0);
    },
  });

  // Test email mutation
  const testSendMutation = useMutation({
    mutationFn: () =>
      api.post<any>('/campaigns/test-send', {
        recipientEmail: testRecipientEmail,
        senderConnectionId: senderConnectionId || null,
        subject,
        htmlBody,
        textBody,
      }),
    onSuccess: (data) => {
      setTestSendSuccess(data.message || 'Test email successfully sent');
    },
  });

  // Launch campaign mutation
  const launchMutation = useMutation({
    mutationFn: async () => {
      // Step 1: Create Campaign
      const campaign = await api.post<any>('/campaigns', {
        name,
        subject,
        templateId: templateId || null,
        htmlBody,
        textBody: textBody || undefined,
        senderConnectionId: senderConnectionId || null,
        contactListIds: selectedListIds,
        trackingOpenEnabled,
        trackingClickEnabled,
        includeUnsubscribe,
        replyTo: replyTo || undefined,
      });

      // Step 2: Launch idempotently
      const idempotencyKey = crypto.randomUUID();
      await api.post(`/campaigns/${campaign.id}/launch`, { idempotencyKey });
      return campaign;
    },
    onSuccess: (campaign) => {
      navigate(`/campaigns/${campaign.id}`);
    },
  });

  const steps = [
    { number: 1, title: 'Details', icon: Mail },
    { number: 2, title: 'Recipients', icon: Users },
    { number: 3, title: 'Personalization', icon: Eye },
    { number: 4, title: 'Tracking & Privacy', icon: Shield },
    { number: 5, title: 'Review & Send', icon: Send },
  ];

  const handleNextFromStep2 = () => {
    previewMutation.mutate();
    setStep(3);
  };

  const selectedListsTotalContacts =
    listsData?.lists
      .filter((l) => selectedListIds.includes(l.id))
      .reduce((sum, l) => sum + (l.memberCount || 0), 0) || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Step Indicator Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create Campaign</h1>
        <p className="text-sm text-slate-500 mt-1">
          Follow the five-step wizard to configure audience, content, and tracking.
        </p>

        <div className="mt-6 flex items-center justify-between border-b border-slate-200 pb-4">
          {steps.map((s) => {
            const isCurrent = step === s.number;
            const isCompleted = step > s.number;

            return (
              <div key={s.number} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-500'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : s.number}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:inline ${
                    isCurrent ? 'text-slate-900 font-bold' : 'text-slate-400'
                  }`}
                >
                  {s.title}
                </span>
                {s.number < 5 && <ChevronRight className="w-4 h-4 text-slate-300 ml-2 hidden sm:inline" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 1: CAMPAIGN DETAILS */}
      {step === 1 && (
        <Card className="space-y-6">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Mail className="w-4 h-4 text-emerald-600" /> Step 1: Campaign Details
          </h2>

          <div className="space-y-4">
            <Input
              label="Campaign Name *"
              required
              placeholder="e.g. October Community Newsletter"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Sender Gmail Account *
              </label>
              {connectionData?.connection?.connectionStatus === 'connected' ? (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-emerald-900 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{connectionData.connection.email || 'Authenticated Gmail Account'}</span>
                  </div>
                  <span className="text-xs text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                    Active
                  </span>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>No active Gmail account connected.</span>
                  </div>
                  <Link to="/settings/integrations">
                    <Button size="sm" variant="outline" className="bg-white">
                      Connect Gmail
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Use Saved Template (Optional)
              </label>
              <select
                className="w-full rounded-lg border border-slate-300 p-2 text-sm bg-white"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                <option value="">Start from scratch or draft below</option>
                {templatesData?.templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — ({t.subject})
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Email Subject Line *"
              required
              placeholder="Hi {{first_name}}, updates regarding {{company}}"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              helperText="Use merge variables such as {{first_name}}, {{last_name}}, {{company}}."
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                HTML Email Content *
              </label>
              <textarea
                rows={8}
                required
                className="w-full rounded-lg border border-slate-300 p-3 text-xs font-mono focus:ring-2 focus:ring-emerald-500"
                value={htmlBody}
                onChange={(e) => setHtmlBody(e.target.value)}
              />
            </div>

            <Input
              label="Optional Reply-To Address"
              type="email"
              placeholder="support@example.org"
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
              helperText="If omitted, replies will route directly to your connected Gmail address."
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <Button
              disabled={!name.trim() || !subject.trim() || !htmlBody.trim()}
              onClick={() => setStep(2)}
              icon={<ChevronRight className="w-4 h-4" />}
            >
              Continue to Select Recipients
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 2: SELECT RECIPIENTS */}
      {step === 2 && (
        <Card className="space-y-6">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" /> Step 2: Select Audience Lists
          </h2>

          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Select one or more contact lists to send to. Unsubscribed or suppressed emails are automatically excluded before sending.
            </p>

            {listsData?.lists && listsData.lists.length > 0 ? (
              <div className="space-y-2">
                {listsData.lists.map((l) => {
                  const isChecked = selectedListIds.includes(l.id);
                  return (
                    <label
                      key={l.id}
                      className={`flex items-center justify-between p-3.5 rounded-lg border cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-emerald-500 bg-emerald-50/40'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.value) {
                              if (isChecked) {
                                setSelectedListIds(selectedListIds.filter((id) => id !== l.id));
                              } else {
                                setSelectedListIds([...selectedListIds, l.id]);
                              }
                            }
                          }}
                        />
                        <div>
                          <p className="font-semibold text-sm text-slate-900">{l.name}</p>
                          {l.description && (
                            <p className="text-xs text-slate-500 mt-0.5">{l.description}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 bg-white border border-slate-200 rounded-full text-slate-700">
                        {l.memberCount} contacts
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg text-center">
                <p className="text-sm font-medium text-slate-700">No contact lists found</p>
                <p className="text-xs text-slate-500 mt-1">
                  Please import a CSV of contacts first on the Contacts page.
                </p>
                <Link to="/contacts" className="mt-3 inline-block">
                  <Button size="sm">Go to Contacts</Button>
                </Link>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600">Total Contacts Selected:</span>
              <span className="font-bold text-slate-900 text-sm">{selectedListsTotalContacts}</span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setStep(1)} icon={<ChevronLeft className="w-4 h-4" />}>
              Back
            </Button>
            <Button
              disabled={selectedListIds.length === 0}
              onClick={handleNextFromStep2}
              icon={<ChevronRight className="w-4 h-4" />}
            >
              Continue to Personalization
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 3: PERSONALIZATION PREVIEW */}
      {step === 3 && (
        <Card className="space-y-6">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-600" /> Step 3: Personalization Preview
          </h2>

          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Verify how your subject and message body will render for actual recipients in your list.
            </p>

            {previewMutation.isPending ? (
              <div className="p-8 text-center text-slate-400">Rendering preview samples...</div>
            ) : previews.length > 0 ? (
              <div className="space-y-4">
                {/* Sample selector toolbar */}
                <div className="flex items-center justify-between bg-slate-100 p-2 rounded-lg">
                  <span className="text-xs font-semibold text-slate-700">
                    Sample {previewIndex + 1} of {previews.length}: {previews[previewIndex]?.recipientEmail}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={previewIndex <= 0}
                      onClick={() => setPreviewIndex(previewIndex - 1)}
                    >
                      Previous Sample
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={previewIndex >= previews.length - 1}
                      onClick={() => setPreviewIndex(previewIndex + 1)}
                    >
                      Next Sample
                    </Button>
                  </div>
                </div>

                {/* Missing variables alert */}
                {previews[previewIndex]?.missingVariables?.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Missing variables for this contact:{' '}
                      <strong className="font-mono">
                        {previews[previewIndex].missingVariables.join(', ')}
                      </strong>
                    </span>
                  </div>
                )}

                {/* Subject Preview */}
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-xs font-semibold text-slate-500 block">Resolved Subject:</span>
                  <p className="text-sm font-medium text-slate-900 mt-0.5">
                    {previews[previewIndex]?.resolvedSubject}
                  </p>
                </div>

                {/* Body Preview */}
                <div className="p-4 bg-white border border-slate-200 rounded-lg">
                  <span className="text-xs font-semibold text-slate-500 block mb-2">Resolved HTML Body:</span>
                  <div
                    className="prose prose-sm max-w-none border-t border-slate-100 pt-3"
                    dangerouslySetInnerHTML={{
                      __html: previews[previewIndex]?.resolvedHtml || '',
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 text-xs">
                No recipient preview available. Ensure selected list contains contacts.
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setStep(2)} icon={<ChevronLeft className="w-4 h-4" />}>
              Back
            </Button>
            <Button onClick={() => setStep(4)} icon={<ChevronRight className="w-4 h-4" />}>
              Continue to Tracking & Privacy
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 4: TRACKING & PRIVACY */}
      {step === 4 && (
        <Card className="space-y-6">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" /> Step 4: Tracking & Privacy Configuration
          </h2>

          <div className="space-y-4">
            {/* Open tracking toggle */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="font-semibold text-sm text-slate-900">Email-Open Tracking</span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Embeds a transparent 1×1 pixel image to detect when the email client fetches images.
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-5 h-5"
                  checked={trackingOpenEnabled}
                  onChange={(e) => setTrackingOpenEnabled(e.target.checked)}
                />
              </label>
              <div className="p-2 bg-amber-50/70 rounded text-[11px] text-amber-800 border border-amber-200/60">
                <strong>Responsible signal note:</strong> Open tracking is an approximate indicator. Image proxies (like Apple Mail Privacy Protection or Google Image Proxy) may preload images automatically.
              </div>
            </div>

            {/* Link click tracking toggle */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="font-semibold text-sm text-slate-900">Tracked-Link Click Tracking</span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Routes external links through secure redirect tokens to record click engagement.
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-5 h-5"
                  checked={trackingClickEnabled}
                  onChange={(e) => setTrackingClickEnabled(e.target.checked)}
                />
              </label>
              <p className="text-[11px] text-slate-500">
                Security scanners and preview bots may generate click events before the recipient opens the link.
              </p>
            </div>

            {/* Unsubscribe link toggle */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="font-semibold text-sm text-slate-900">Include One-Click Unsubscribe Link</span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Appends a clean footer link allowing recipients to opt out of future mailings instantly.
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-5 h-5"
                  checked={includeUnsubscribe}
                  onChange={(e) => setIncludeUnsubscribe(e.target.checked)}
                />
              </label>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setStep(3)} icon={<ChevronLeft className="w-4 h-4" />}>
              Back
            </Button>
            <Button onClick={() => setStep(5)} icon={<ChevronRight className="w-4 h-4" />}>
              Review & Finalize
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 5: REVIEW & SEND */}
      {step === 5 && (
        <Card className="space-y-6">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Send className="w-4 h-4 text-emerald-600" /> Step 5: Final Review & Launch
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                Campaign Configuration
              </span>
              <div>
                <span className="text-slate-500">Name:</span> <strong className="text-slate-900">{name}</strong>
              </div>
              <div>
                <span className="text-slate-500">Subject:</span>{' '}
                <strong className="text-slate-900">{subject}</strong>
              </div>
              <div>
                <span className="text-slate-500">Sender:</span>{' '}
                <strong className="text-slate-900">
                  {connectionData?.connection?.email || 'Connected Gmail Account'}
                </strong>
              </div>
              {replyTo && (
                <div>
                  <span className="text-slate-500">Reply-To:</span>{' '}
                  <strong className="text-slate-900">{replyTo}</strong>
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-slate-600 uppercase tracking-wider text-[10px]">
                Audience & Privacy
              </span>
              <div>
                <span className="text-slate-500">Estimated Recipients:</span>{' '}
                <strong className="text-emerald-700 font-bold text-sm">
                  {selectedListsTotalContacts}
                </strong>
              </div>
              <div>
                <span className="text-slate-500">Open Tracking:</span>{' '}
                <strong>{trackingOpenEnabled ? 'Enabled' : 'Disabled'}</strong>
              </div>
              <div>
                <span className="text-slate-500">Click Tracking:</span>{' '}
                <strong>{trackingClickEnabled ? 'Enabled' : 'Disabled'}</strong>
              </div>
              <div>
                <span className="text-slate-500">Unsubscribe Link:</span>{' '}
                <strong>{includeUnsubscribe ? 'Included' : 'None'}</strong>
              </div>
            </div>
          </div>

          {/* Action to dispatch a single test email */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold text-blue-900">Send Test Email First</h4>
              <p className="text-[11px] text-blue-700 mt-0.5">
                Send a sample message to your own inbox to inspect styling and layout before launching.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="bg-white border-blue-300 text-blue-900 hover:bg-blue-50"
              onClick={() => {
                setTestRecipientEmail(connectionData?.connection?.email || '');
                setIsTestSendOpen(true);
              }}
            >
              Send Test Email
            </Button>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setStep(4)} icon={<ChevronLeft className="w-4 h-4" />}>
              Back
            </Button>
            <Button
              isLoading={launchMutation.isPending}
              icon={<Send className="w-4 h-4" />}
              onClick={() => {
                if (
                  confirm(
                    `Queue campaign "${name}" to be sent to ${selectedListsTotalContacts} recipients?`
                  )
                ) {
                  launchMutation.mutate();
                }
              }}
            >
              Launch Campaign Now
            </Button>
          </div>
        </Card>
      )}

      {/* Test Email Modal */}
      <Modal
        isOpen={isTestSendOpen}
        onClose={() => {
          setIsTestSendOpen(false);
          setTestSendSuccess(null);
        }}
        title="Send Test Email"
        description="Verify template rendering in your email client."
      >
        <div className="space-y-4">
          {testSendSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{testSendSuccess}</span>
            </div>
          )}

          <Input
            label="Recipient Email Address"
            type="email"
            required
            placeholder="you@example.com"
            value={testRecipientEmail}
            onChange={(e) => setTestRecipientEmail(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setIsTestSendOpen(false);
                setTestSendSuccess(null);
              }}
            >
              Close
            </Button>
            <Button
              isLoading={testSendMutation.isPending}
              onClick={() => testSendMutation.mutate()}
              disabled={!testRecipientEmail}
            >
              Dispatch Test
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
