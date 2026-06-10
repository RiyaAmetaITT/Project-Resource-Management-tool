import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-key-for-prm-tests';
process.env.NODE_ENV = 'test';
