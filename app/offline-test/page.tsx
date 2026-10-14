'use client';

import { useState } from 'react';
import { testLocalSQLite } from '@/lib/offline-sqlite-test';

export default function OfflineTestPage() {
  const [message, setMessage] = useState('SQLite পরীক্ষা করার জন্য বোতাম চাপুন।');
  const [loading, setLoading] = useState(false);

  async function runTest() {
    setLoading(true);
    setMessage('পরীক্ষা চলছে...');

    try {
      const result = await testLocalSQLite();
      setMessage(JSON.stringify(result, null, 2));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'SQLite পরীক্ষা ব্যর্থ হয়েছে।'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 700, margin: '40px auto', padding: 24 }}>
      <h1>Smart School — Offline SQLite Test</h1>
      <p>এই পরীক্ষা শুধু আলাদা test database ব্যবহার করে।</p>

      <button
        onClick={runTest}
        disabled={loading}
        style={{ padding: '12px 20px', cursor: 'pointer' }}
      >
        {loading ? 'পরীক্ষা চলছে...' : 'Test SQLite'}
      </button>

      <pre
        style={{
          marginTop: 20,
          padding: 16,
          background: '#f3f4f6',
          color: '#111827',
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
        }}
      >
        {message}
      </pre>
    </main>
  );
}
