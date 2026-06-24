import { MaintenanceTaskMetadata, Task } from '../models/task.model';

interface TallyFieldSnapshot {
  label: string;
  value: string;
  type: string;
}

export function extractMaintenanceMetadata(task: Task): MaintenanceTaskMetadata {
  const fallback = maintenanceFromTallyFields(task.metadata, task.description);
  const value = task.metadata['maintenance'];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fallback;
  }

  const record = value as Partial<MaintenanceTaskMetadata>;
  return {
    ...fallback,
    ...record,
    requesterName: String(record.requesterName || fallback.requesterName),
    email: String(record.email || fallback.email),
    phone: String(record.phone || fallback.phone),
    city: String(record.city || fallback.city),
    building: fallback.building || preferReadableValue(record.building, fallback.building),
    apartment: preferReadableValue(record.apartment, fallback.apartment),
    maintenanceType: preferReadableValue(record.maintenanceType, fallback.maintenanceType),
    issue: String(record.issue || fallback.issue),
    moreDetails: String(record.moreDetails || fallback.moreDetails),
    filesMedia: Array.isArray(record.filesMedia) && record.filesMedia.length > 0
      ? record.filesMedia.map(item => String(item))
      : fallback.filesMedia,
  };
}

export function maintenanceDisplayTitle(task: Task): string {
  const maintenance = extractMaintenanceMetadata(task);
  const issue = maintenance.issue.trim() || stripGeneratedLocation(task.title).trim() || task.shortTitle.trim();
  const location = [maintenance.building, maintenance.apartment]
    .map(value => value.trim())
    .filter(Boolean)
    .join(' ');

  return [truncateText(issue || 'Maintenance request', 10), location].filter(Boolean).join(' - ');
}

export function maintenanceDisplayDescription(task: Task): string {
  const maintenance = extractMaintenanceMetadata(task);
  const details = [
    maintenance.moreDetails,
    maintenance.maintenanceType ? `Type: ${maintenance.maintenanceType}` : '',
    maintenance.phone ? `Phone: ${maintenance.phone}` : '',
    maintenance.requesterName ? `Name: ${maintenance.requesterName}` : '',
    maintenance.filesMedia.length > 0 ? `Files: ${maintenance.filesMedia.join(', ')}` : '',
  ].filter(Boolean);

  return details.join('\n') || maintenance.issue || task.description;
}

export function maintenanceDisplayTags(task: Task): string[] {
  const maintenance = extractMaintenanceMetadata(task);
  return [
    maintenance.city,
    maintenance.maintenanceType,
    maintenance.phone,
  ].map(value => value.trim()).filter(Boolean);
}

export function maintenanceBuilding(task: Task): string {
  return extractMaintenanceMetadata(task).building.trim();
}

function maintenanceFromTallyFields(metadata: Record<string, unknown>, description: string): MaintenanceTaskMetadata {
  const empty = emptyMaintenanceMetadata();
  const maintenance = metadata['maintenance'];
  const rawFields = maintenance && typeof maintenance === 'object' && !Array.isArray(maintenance)
    ? (maintenance as Record<string, unknown>)['tallyFields']
    : metadata['tallyFields'];

  const fields = Array.isArray(rawFields)
    ? rawFields.map(field => normalizeTallyField(field)).filter((field): field is TallyFieldSnapshot => field !== null)
    : [];
  const fromDescription = maintenanceFromDescription(description);
  if (fields.length === 0) return { ...empty, ...fromDescription };

  return {
    ...empty,
    ...fromDescription,
    requesterName: pickTallyValue(fields, ['name', 'full name', 'tenant', 'client', 'requester']) || fromDescription.requesterName || '',
    email: pickTallyValue(fields, ['email', 'e-mail', 'email address']) || fromDescription.email || '',
    phone: pickTallyValue(fields, ['phone number', 'phone', 'mobile']) || fromDescription.phone || '',
    city: pickTallyValue(fields, ['city']) || fromDescription.city || '',
    building: pickTallyValue(fields, ['question_PplM8d', 'complex']) || pickTallyValue(fields, ['building', 'property']) || fromDescription.building || '',
    apartment: pickTallyValue(fields, ['apartment', 'unit']) || fromDescription.apartment || '',
    maintenanceType: pickTallyValue(fields, ['maintenance type', 'type']) || fromDescription.maintenanceType || '',
    issue: pickTallyValue(fields, ['what is the maintenance issue that needs attention?', 'maintenance issue', 'issue', 'problem', 'request']) || fromDescription.issue || '',
    moreDetails: pickTallyValue(fields, ['more details', 'additional details']) || fromDescription.moreDetails || '',
    filesMedia: fields
      .filter(field => field.type.toUpperCase() === 'FILE_UPLOAD' && field.value)
      .map(field => field.value),
  };
}

function normalizeTallyField(value: unknown): TallyFieldSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  return {
    label: [record['key'], record['label']].map(item => String(item ?? '').trim()).filter(Boolean).join(' '),
    value: stringifyTallyValue(record),
    type: String(record['type'] ?? ''),
  };
}

function stringifyTallyValue(record: Record<string, unknown>): string {
  const value = record['value'];
  if (value === null || value === undefined) return '';

  if (Array.isArray(value)) {
    const options = Array.isArray(record['options']) ? record['options'] : [];
    const selectedOptions = options
      .map(option => option && typeof option === 'object' ? option as Record<string, unknown> : null)
      .filter((option): option is Record<string, unknown> => option !== null)
      .filter(option => value.map(item => String(item)).includes(String(option['id'] ?? '')))
      .map(option => String(option['text'] ?? '').trim())
      .filter(Boolean);

    if (selectedOptions.length > 0) return selectedOptions.join(', ');
    return value.map(item => String(item ?? '').trim()).filter(Boolean).join(', ');
  }

  if (typeof value === 'object') {
    const valueRecord = value as Record<string, unknown>;
    return String(valueRecord['url'] ?? valueRecord['name'] ?? JSON.stringify(value)).trim();
  }

  return String(value).trim();
}

function pickTallyValue(fields: TallyFieldSnapshot[], aliases: string[]): string {
  const normalizedAliases = aliases.map(alias => normalizeLabel(alias));
  return fields.find(field => {
    const label = normalizeLabel(field.label);
    return normalizedAliases.some(alias => label === alias || label.includes(alias));
  })?.value.trim() ?? '';
}

function maintenanceFromDescription(description: string): Partial<MaintenanceTaskMetadata> {
  const lines = String(description ?? '').split(/\r?\n/);
  const pick = (labels: string[]) => {
    const normalizedLabels = labels.map(label => normalizeLabel(label));
    const line = lines.find(entry => {
      const [rawLabel] = entry.split(':');
      const label = normalizeLabel(rawLabel);
      return normalizedLabels.some(candidate => label === candidate || label.includes(candidate));
    });
    return line?.slice(line.indexOf(':') + 1).trim() ?? '';
  };

  return {
    requesterName: pick(['Requester', 'Name']),
    email: pick(['Email']),
    phone: pick(['Phone']),
    city: pick(['City']),
    building: pick(['Property', 'Complex', 'Building']),
    apartment: pick(['Apartment', 'Unit']),
    maintenanceType: pick(['Maintenance type']),
    issue: pick(['Issue', 'What is the maintenance issue that needs attention?']),
    moreDetails: pick(['More details']),
  };
}

function preferReadableValue(value: unknown, fallback: string): string {
  const normalized = String(value ?? '').trim();
  if (!normalized) return fallback;
  if (fallback && looksLikeTallyOptionId(normalized)) return fallback;
  return normalized;
}

function looksLikeTallyOptionId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function stripGeneratedLocation(value: string): string {
  return String(value ?? '').split(' - ')[0] ?? '';
}

function truncateText(value: string, maxLength: number): string {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function normalizeLabel(value: string): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function emptyMaintenanceMetadata(): MaintenanceTaskMetadata {
  return {
    requesterName: '',
    email: '',
    phone: '',
    city: '',
    building: '',
    apartment: '',
    maintenanceType: '',
    issue: '',
    moreDetails: '',
    filesMedia: [],
  };
}
