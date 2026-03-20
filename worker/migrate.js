const CURRENT_SCHEMA_VERSION = 1;

// Migrate a user record to the current schema version.
// Returns { record, changed } where changed indicates if a write-back is needed.
export function migrateUser(record) {
  if (!record || typeof record !== "object") {
    return { record: null, changed: false };
  }

  let changed = false;

  // Future migrations go here:
  // if (record.schemaVersion < 2) {
  //   record.newField = record.newField ?? "default";
  //   record.schemaVersion = 2;
  //   changed = true;
  // }

  if (!record.schemaVersion) {
    record.schemaVersion = CURRENT_SCHEMA_VERSION;
    changed = true;
  }

  return { record, changed };
}

export { CURRENT_SCHEMA_VERSION };
