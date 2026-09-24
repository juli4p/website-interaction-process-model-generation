const DB_NAME = "activity-recorder";
const DB_VERSION = 1;
const STORE = "events";

// cache the db promise to avoid opening multiple connections
let dbPromise = null;

// opens the IndexedDB database and creates event store if it doesn't exist
export function openDb() {
  // reuse existing promise if it exists
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // runs only when the database is created or upgraded
    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

// adds a new event to the IndexedDB database
export async function addEvent(event) {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);
    const request = store.add(event);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllEvents() {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readonly");
    const store = transaction.objectStore(STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function countEvents() {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readonly");
    const store = transaction.objectStore(STORE);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function clearEvents() {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).clear();

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function replaceAllEvents(events) {
  if (!Array.isArray(events)) {
    throw new TypeError("Events must be an array");
  }

  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);

    const clearRequest = store.clear();
    const importedEvents = [];

    clearRequest.onerror = () => {
      transaction.abort();
    };

    clearRequest.onsuccess = () => {
      for (const event of events) {
        // imported IDs are intentionally discarded
        // indexedDB creates new IDs without collision risk
        const { id: _importedId, ...eventWithoutId } = event;

        const request = store.add(eventWithoutId);

        request.onsuccess = () => {
          importedEvents.push({
            ...eventWithoutId,
            id: request.result,
          });
        };
      }
    };

    transaction.oncomplete = () => {
      importedEvents.sort((first, second) => first.id - second.id);
      resolve(importedEvents);
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };

    transaction.onabort = () => {
      reject(transaction.error ?? new Error("Event import was aborted"));
    };
  });
}

// allowed properties are specified in shared/events/editable-event-fields.js
export async function updateEvent(id, path, value) {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);
    const request = store.get(id);

    let updatedEvent = null;

    request.onsuccess = () => {
      updatedEvent = request.result;

      if (!updatedEvent) {
        transaction.abort();
        return;
      }

      setNestedValue(updatedEvent, path, value);
      store.put(updatedEvent);
    };

    transaction.oncomplete = () => resolve(updatedEvent);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () =>
      reject(transaction.error ?? new Error(`Event with id ${id} not found`));
  });
}

export async function updateSelectorSegment(
  id,
  segmentIndex,
  { segment, index, matchCount },
) {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);
    const request = store.get(id);

    let updatedEvent = null;

    request.onsuccess = () => {
      updatedEvent = request.result;

      if (!updatedEvent) {
        transaction.abort();
        return;
      }

      const selector = updatedEvent.data?.selector;

      if (
        !selector ||
        !Array.isArray(selector.segments) ||
        !Array.isArray(selector.indexes) ||
        !Array.isArray(selector.matchCounts)
      ) {
        transaction.abort();
        return;
      }

      if (
        segmentIndex < 0 ||
        segmentIndex >= selector.segments.length ||
        segmentIndex >= selector.indexes.length ||
        segmentIndex >= selector.matchCounts.length
      ) {
        transaction.abort();
        return;
      }

      selector.segments[segmentIndex] = segment;
      selector.indexes[segmentIndex] = index;
      selector.matchCounts[segmentIndex] = matchCount;

      store.put(updatedEvent);
    };

    transaction.oncomplete = () => {
      resolve(updatedEvent);
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };

    transaction.onabort = () => {
      reject(
        transaction.error ??
          new Error(
            `Could not update selector segment ${segmentIndex} of event ${id}`,
          ),
      );
    };
  });
}

export async function replaceEvent(event) {
  if (!Number.isInteger(event?.id)) {
    throw new TypeError(`Invalid event id: ${event?.id}`);
  }

  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);

    store.put(event);

    transaction.oncomplete = () => resolve(event);
    transaction.onerror = () => reject(transaction.error);
  });
}

function setNestedValue(object, path, value) {
  const parts = path.split(".");
  const property = parts.pop();

  if (!property) {
    throw new Error(`Invalid event property path: ${path}`);
  }

  let current = object;

  for (const part of parts) {
    if (current === null || typeof current !== "object" || !(part in current)) {
      throw new Error(`Invalid event property path: ${path}`);
    }

    current = current[part];
  }

  // enable setting values not only in paths but also arrays (eg selector segments and indexes)
  if (Array.isArray(current)) {
    const index = Number(property);

    if (!Number.isInteger(index) || index < 0 || index >= current.length) {
      throw new Error(`Invalid array index in event property path: ${path}`);
    }

    current[index] = value;
    return;
  }

  if (current === null || typeof current !== "object") {
    throw new Error(`Invalid event property path: ${path}`);
  }

  current[property] = value;
}
