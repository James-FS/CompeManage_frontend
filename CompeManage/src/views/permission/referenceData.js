const cacheDuration = 60_000
const entries = new Map()
let sessionToken

export function getPermissionReference(key, load) {
  const token = localStorage.getItem('token')
  if (!token) return load()
  if (sessionToken !== token) {
    entries.clear()
    sessionToken = token
  }

  const cached = entries.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.promise

  const entry = { expiresAt: Infinity }
  entry.promise = load().then(response => {
    entry.expiresAt = Date.now() + cacheDuration
    return response
  }, error => {
    if (entries.get(key) === entry) entries.delete(key)
    throw error
  })
  entries.set(key, entry)
  return entry.promise
}
