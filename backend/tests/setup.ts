process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://slos:slos_dev_password@localhost:5432/slos';
process.env.JWT_SECRET ??= 'test-only-secret-that-is-long-enough-32';
process.env.CORS_ORIGIN ??= 'http://localhost:3000';
process.env.S3_ACCESS_KEY ??= 'test-minio-access-key';
process.env.S3_SECRET_KEY ??= 'test-minio-secret-key';
