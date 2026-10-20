export type CampaignStatus = 
  | 'draft'
  | 'scheduled'
  | 'queued'
  | 'sending'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type RecipientStatus =
  | 'queued'
  | 'sending'
  | 'accepted_by_provider'
  | 'send_failed'
  | 'delivery_unknown'
  | 'delivery_confirmed'
  | 'bounced';

export type TrackingEventType =
  | 'open'
  | 'click'
  | 'unsubscribe'
  | 'bounce';

export type TrackingTokenType = 'open' | 'click' | 'unsubscribe';

export type SuppressionReason =
  | 'unsubscribed'
  | 'bounced'
  | 'complaint'
  | 'manual';

export type SuppressionSource =
  | 'recipient_action'
  | 'admin_manual'
  | 'provider_feedback'
  | 'import_exclusion';

export type AuditAction =
  | 'user_login'
  | 'user_logout'
  | 'google_connected'
  | 'google_disconnected'
  | 'contacts_imported'
  | 'contact_deleted'
  | 'template_created'
  | 'template_updated'
  | 'template_deleted'
  | 'campaign_created'
  | 'campaign_launched'
  | 'campaign_paused'
  | 'campaign_resumed'
  | 'campaign_cancelled'
  | 'suppression_added'
  | 'suppression_removed'
  | 'privacy_updated';

export interface UserSummary {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GoogleConnectionSummary {
  id: string;
  userId: string;
  email?: string;
  scopes: string[];
  expiresAt: string | null;
  connectionStatus: 'connected' | 'expired' | 'revoked' | 'error';
  createdAt: string;
  updatedAt: string;
}

export interface ContactRecord {
  id: string;
  ownerId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  customFields: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  isSuppressed?: boolean;
}

export interface ContactListRecord {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplateRecord {
  id: string;
  ownerId: string;
  name: string;
  subject: string;
  htmlBody: string;
  textBody: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignRecord {
  id: string;
  ownerId: string;
  templateId: string | null;
  name: string;
  status: CampaignStatus;
  subject: string;
  senderConnectionId: string | null;
  trackingOpenEnabled: boolean;
  trackingClickEnabled: boolean;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  totalRecipients: number;
  sentCount: number;
  openCount: number;
  uniqueOpenCount: number;
  clickCount: number;
  uniqueClickCount: number;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignRecipientRecord {
  id: string;
  campaignId: string;
  contactId: string | null;
  recipientEmail: string;
  renderedSubject: string;
  status: RecipientStatus;
  providerMessageId: string | null;
  queuedAt: string | null;
  acceptedAt: string | null;
  failedAt: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  openCount: number;
  firstOpenedAt: string | null;
  lastOpenedAt: string | null;
  clickCount: number;
  firstClickedAt: string | null;
  lastClickedAt: string | null;
  unsubscribedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignAnalyticsSummary {
  campaignId: string;
  campaignName: string;
  status: CampaignStatus;
  totalRecipients: number;
  queuedCount: number;
  sendingCount: number;
  acceptedByProviderCount: number;
  sendFailedCount: number;
  deliveryUnknownCount: number;
  deliveryConfirmedCount: number;
  detectedOpenEvents: number;
  uniqueDetectedOpens: number;
  detectedOpenRatePct: number;
  trackedClickEvents: number;
  uniqueTrackedClicks: number;
  trackedClickRatePct: number;
  unsubscribeCount: number;
  bounceCount: number;
  startedAt: string | null;
  completedAt: string | null;
}

export interface CSVPreviewRow {
  rowIndex: number;
  raw: Record<string, string>;
  normalizedEmail?: string;
  isValid: boolean;
  errors: string[];
}

export interface CSVImportResult {
  totalRows: number;
  validContacts: number;
  invalidAddresses: number;
  duplicateRecords: number;
  suppressedAddresses: number;
  successfullyImported: number;
  errors: Array<{ row: number; email?: string; message: string }>;
}
