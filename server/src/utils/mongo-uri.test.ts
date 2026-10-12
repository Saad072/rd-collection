import { describe, expect, it } from 'vitest';
import { mongoHost, redactMongoUri, sanitizeMongoUri } from './mongo-uri';

describe('sanitizeMongoUri', () => {
  it('trims surrounding whitespace and quotes', () => {
    expect(sanitizeMongoUri('  "mongodb://u:p@h/db"  ')).toBe('mongodb://u:p@h/db');
    expect(sanitizeMongoUri("'mongodb://u:p@h/db'")).toBe('mongodb://u:p@h/db');
  });
  it('removes zero-width and control characters', () => {
    expect(sanitizeMongoUri('mongodb://u:p@h​/db')).toBe('mongodb://u:p@h/db');
    expect(sanitizeMongoUri('mongodb://u:p@h/db\n')).toBe('mongodb://u:p@h/db');
  });
  it('leaves a clean URI untouched', () => {
    const u = 'mongodb+srv://user:pass@cluster0.abc.mongodb.net/?appName=X';
    expect(sanitizeMongoUri(u)).toBe(u);
  });
});

describe('redactMongoUri', () => {
  it('hides the password', () => {
    expect(redactMongoUri('mongodb+srv://user:s3cret@host/db')).toBe(
      'mongodb+srv://user:****@host/db',
    );
  });
});

describe('mongoHost', () => {
  it('extracts the host without credentials', () => {
    expect(mongoHost('mongodb+srv://user:s3cret@cluster0.abc.mongodb.net/?x=1')).toBe(
      'cluster0.abc.mongodb.net',
    );
    expect(mongoHost('mongodb://localhost:27017/db')).toBe('localhost:27017');
  });
});
