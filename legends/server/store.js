// Speicher für den Weltserver.
// - Mit MONGODB_URI: dauerhaft in MongoDB (kostenloser Atlas-Cluster). Jede Welt ist ein eigenes Dokument,
//   damit kein Dokument zu groß wird und nur Geändertes geschrieben wird.
// - Ohne: JSON-Datei (lokal/Tests), wie bisher.
const fs = require('fs');
const path = require('path');

function fileStore(file) {
  return {
    kind: 'datei',
    async load() { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { fs.mkdirSync(path.dirname(file), { recursive: true }); return null; } },
    async save(db) { await fs.promises.writeFile(file + '.tmp', JSON.stringify(db)); await fs.promises.rename(file + '.tmp', file); },
    async close() {},
  };
}

// col: Collection mit find/replaceOne/deleteOne (MongoDB-Treiber oder Test-Attrappe)
function docStore(col, close = async () => {}) {
  const last = new Map(); // _id → zuletzt geschriebenes JSON
  const docs = db => {
    const out = new Map();
    for (const [k, v] of Object.entries(db)) {
      if (k === 'worlds') for (const [c, w] of Object.entries(v || {})) out.set('w:' + c, w);
      else out.set('t:' + k, v);
    }
    return out;
  };
  return {
    kind: 'mongodb',
    async load() {
      const db = { worlds: {}, accounts: {} };
      for (const d of await col.find({}).toArray()) {
        const v = JSON.parse(d.json);
        if (d._id.startsWith('w:')) db.worlds[d._id.slice(2)] = v; else db[d._id.slice(2)] = v;
        last.set(d._id, d.json);
      }
      return last.size ? db : null;
    },
    async save(db) {
      const now = docs(db), jobs = [];
      for (const [id, v] of now) {
        const json = JSON.stringify(v);
        if (last.get(id) === json) continue;
        jobs.push(col.replaceOne({ _id: id }, { _id: id, json, at: new Date() }, { upsert: true }).then(() => last.set(id, json)));
      }
      for (const id of [...last.keys()]) if (!now.has(id)) jobs.push(col.deleteOne({ _id: id }).then(() => last.delete(id)));
      await Promise.all(jobs);
      return jobs.length;
    },
    close,
  };
}

async function openStore(file) {
  const uri = process.env.MONGODB_URI;
  if (!uri) return fileStore(file);
  const { MongoClient } = require('mongodb');
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
  await client.connect();
  const col = client.db(process.env.MONGODB_DB || 'legends').collection('state');
  return docStore(col, () => client.close());
}

module.exports = { openStore, docStore, fileStore };
