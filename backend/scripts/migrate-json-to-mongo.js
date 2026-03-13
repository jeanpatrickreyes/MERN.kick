const fs = require('fs');
const mongoose = require('mongoose');

async function migrate() {
  const dbJson = JSON.parse(fs.readFileSync('./data/database.json', 'utf-8'));

  await mongoose.connect('mongodb://127.0.0.1:27017/kick');
  console.log('Connected to MongoDB');

  for (const [collName, docs] of Object.entries(dbJson)) {
    if (docs === null || docs === undefined || typeof docs !== 'object') continue;
    const records = Object.entries(docs).map(function(entry) {
      return { _id: entry[0], ...entry[1] };
    });
    if (records.length > 0) {
      const col = mongoose.connection.collection(collName);
      await col.deleteMany({});
      await col.insertMany(records);
      console.log(collName + ': imported ' + records.length + ' records');
    }
  }

  await mongoose.disconnect();
  console.log('Done!');
}

migrate().catch(function(err) { console.error(err); process.exit(1); });
