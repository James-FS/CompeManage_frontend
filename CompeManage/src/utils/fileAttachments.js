const displayNameFromUrl = (url, fallback = '') => {
  if (!url) return fallback
  const filename = String(url).split('/').pop() || ''
  const hashPrefix = filename.indexOf('_')
  const originalName = hashPrefix >= 0 ? filename.slice(hashPrefix + 1) : filename
  try {
    return decodeURIComponent(originalName) || fallback
  } catch {
    return originalName || fallback
  }
}

const parseStoredValue = (value) => {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string' || !value.trim()) return []

  const trimmed = value.trim()
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed
    } catch {
      // Keep compatibility with legacy comma-separated URLs.
    }
  }

  return trimmed.split(',').map((url) => url.trim()).filter(Boolean)
}

export const normalizeFileAttachments = (value) => parseStoredValue(value)
  .map((item, index) => {
    if (typeof item === 'string') {
      return {
        uid: `existing-${index}-${item}`,
        name: displayNameFromUrl(item, `附件${index + 1}`),
        url: item,
        status: 'success',
      }
    }

    const url = item?.url || item?.response?.data?.url || ''
    const raw = item?.raw || item?.file
    if (!url && !raw) return null

    return {
      ...item,
      uid: item.uid || `existing-${index}-${url || item.name || 'file'}`,
      name: item.name || displayNameFromUrl(url, `附件${index + 1}`),
      url,
      raw,
      status: item.status || (url ? 'success' : 'ready'),
    }
  })
  .filter(Boolean)

export const fileAttachmentsToReferences = (items = []) => normalizeFileAttachments(items)
  .filter((item) => item.url)
  .map(({ name, url, size, mime_type }) => ({ name, url, size, mime_type }))

export const fileAttachmentsToJSON = (items = []) => {
  const references = fileAttachmentsToReferences(items)
  return references.length ? JSON.stringify(references) : ''
}

export const fileNameFromUrl = displayNameFromUrl
