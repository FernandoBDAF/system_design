// Create admin user
db = db.getSiblingDB("admin");
db.createUser({
  user: "admin",
  pwd: "admin123",
  roles: [
    { role: "userAdminAnyDatabase", db: "admin" },
    { role: "readWriteAnyDatabase", db: "admin" },
  ],
});

// Create profile user
db = db.getSiblingDB("profiles");
db.createUser({
  user: "profile",
  pwd: "profile123",
  roles: [{ role: "readWrite", db: "profiles" }],
});
