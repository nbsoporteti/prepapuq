/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("parent_student");

  // Check if the required users exist before attempting to create the relationship
  let parentLookup;
  let studentLookup;
  
  try {
    parentLookup = app.findFirstRecordByFilter("users", "email='mama.camila@gmail.com'");
  } catch (e) {
    console.log("Skipping parent_student record creation: parent user with email 'mama.camila@gmail.com' not found");
    return;
  }
  
  try {
    studentLookup = app.findFirstRecordByFilter("users", "name~'Camila'");
  } catch (e) {
    console.log("Skipping parent_student record creation: student user with name matching 'Camila' not found");
    return;
  }

  const record0 = new Record(collection);
  record0.set("parent_id", parentLookup.id);
  record0.set("student_id", studentLookup.id);
  
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