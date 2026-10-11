export type Draft = { version: 1; filename: string; bytes: Uint8Array; savedAt: number }
const database = 'xctrack-designer-local'
let writes: Promise<unknown> = Promise.resolve()
function enqueue<T>(run: () => Promise<T>): Promise<T> {
  const result = writes.catch(() => undefined).then(run)
  writes = result
  return result
}
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(database, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('drafts')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? Error('Хранилище черновиков недоступно'))
    request.onblocked = () =>
      reject(Error('Закройте старые вкладки редактора для доступа к черновику'))
  })
}
async function transaction<T>(
  write: boolean,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction('drafts', write ? 'readwrite' : 'readonly')
      const request = run(tx.objectStore('drafts'))
      tx.oncomplete = () => resolve(request.result)
      tx.onerror = () => reject(tx.error ?? Error('Ошибка сохранения черновика'))
      tx.onabort = () => reject(tx.error ?? Error('Сохранение черновика отменено'))
    })
  } finally {
    db.close()
  }
}
export function saveDraft(bytes: Uint8Array, filename: string) {
  if (bytes.byteLength > 5 * 1024 * 1024) return Promise.reject(Error('Черновик больше 5 МБ'))
  const draft: Draft = { version: 1, filename, bytes: bytes.slice(), savedAt: Date.now() }
  return enqueue(() => transaction(true, (store) => store.put(draft, 'current')).then(() => draft))
}
export async function loadDraft(): Promise<Draft | null> {
  await writes.catch(() => undefined)
  const result: unknown = await transaction(false, (store) => store.get('current'))
  if (result === undefined) return null
  const draft = result as Partial<Draft>
  if (
    draft.version !== 1 ||
    !(draft.bytes instanceof Uint8Array) ||
    draft.bytes.length > 5 * 1024 * 1024 ||
    typeof draft.filename !== 'string' ||
    typeof draft.savedAt !== 'number'
  ) {
    throw Error('Несовместимый черновик; исходный XCFG можно открыть отдельно')
  }
  return draft as Draft
}
export function deleteDraft() {
  return enqueue(() => transaction(true, (store) => store.delete('current')))
}
