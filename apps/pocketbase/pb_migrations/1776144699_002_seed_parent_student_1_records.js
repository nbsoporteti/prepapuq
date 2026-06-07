/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("parent_student");

  const record0 = new Record(collection);
    const record0_parent_idLookup = app.findFirstRecordByFilter("users", "email='marta@example.com'");
    if (!record0_parent_idLookup) { throw new Error("Lookup failed for parent_id: no record in 'users' matching \"email='marta@example.com'\""); }
    record0.set("parent_id", record0_parent_idLookup.id);
    const record0_student_idLookup = app.findFirstRecordByFilter("users", "email='camila@example.com'");
    if (!record0_student_idLookup) { throw new Error("Lookup failed for student_id: no record in 'users' matching \"email='camila@example.com'\""); }
    record0.set("student_id", record0_student_idLookup.id);
  try {
    app.save(record0);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }
}, (app) => {
  // Rollback: record IDs not known, manual cleanup needed
})