import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';

const sqlite = new SQLiteConnection(CapacitorSQLite);

export async function testLocalSQLite() {
  if (Capacitor.getPlatform() !== 'android') {
    throw new Error('এই test Android APK-তে চালাতে হবে।');
  }

  const dbName = 'smart_school_offline_test';

  let db;

  try {
    const consistency = await sqlite.checkConnectionsConsistency();
    const exists = await sqlite.isConnection(dbName, false);

    if (consistency.result && exists.result) {
      db = await sqlite.retrieveConnection(dbName, false);
    } else {
      db = await sqlite.createConnection(
        dbName,
        false,
        'no-encryption',
        1,
        false
      );
    }

    await db.open();

    await db.execute(`
      CREATE TABLE IF NOT EXISTS offline_test (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.run(
      'INSERT INTO offline_test (message) VALUES (?)',
      ['SQLite offline test successful']
    );

    const result = await db.query(
      'SELECT id, message, created_at FROM offline_test ORDER BY id DESC LIMIT 1'
    );

    return {
      platform: Capacitor.getPlatform(),
      database: dbName,
      success: true,
      latestRecord: result.values?.[0] ?? null,
    };
  } catch (error) {
    throw error;
  } finally {
    if (db) {
      try {
        await db.close();
      } catch {
        // Ignore close errors during this test.
      }
    }
  }
}
