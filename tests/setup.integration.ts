process.env.DATABASE_URL ??=
  "postgresql://test:test@localhost:5432/cloneusly_test";
process.env.BETTER_AUTH_SECRET ??= "test-secret-".padEnd(32, "x");
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
