export type StoredPerson = {
  id: string;
  name: string;
  embeddings: Float32Array[];
  representativeEmbedding: Float32Array;
  createdAt: string;
};

export interface PersonRepository {
  add(person: StoredPerson): Promise<void>;
  list(): Promise<StoredPerson[]>;
}

const DATABASE_NAME = 'face-recognition-poc';
const STORE_NAME = 'persons';
const DATABASE_VERSION = 1;

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

class IndexedDbPersonRepository implements PersonRepository {
  private databasePromise: Promise<IDBDatabase> | null = null;

  async add(person: StoredPerson): Promise<void> {
    const database = await this.openDatabase();
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const request = transaction.objectStore(STORE_NAME).add(person);
    try {
      await requestToPromise(request);
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'ConstraintError') {
        throw new Error(`Person ID "${person.id}" already exists.`);
      }
      throw reason;
    }
  }

  async list(): Promise<StoredPerson[]> {
    const database = await this.openDatabase();
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const people = await requestToPromise(transaction.objectStore(STORE_NAME).getAll() as IDBRequest<StoredPerson[]>);
    return people.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (!this.databasePromise) {
      this.databasePromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
        request.onupgradeneeded = () => {
          const database = request.result;
          if (!database.objectStoreNames.contains(STORE_NAME)) {
            database.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('Could not open IndexedDB.'));
      });
    }
    return this.databasePromise;
  }
}

export const personRepository: PersonRepository = new IndexedDbPersonRepository();
