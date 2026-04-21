require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smartprint').then(async () => {
  const Job = require('../models/Job');

  // 1. Check stale queued/printing jobs
  const staleQueued = await Job.find(
    { status: { $in: ['queued', 'printing'] } },
    'originalName status queueNumber queuePosition'
  );
  console.log('\n--- Stale queued/printing jobs in DB ---');
  if (staleQueued.length === 0) {
    console.log('None found — DB is clean ✅');
  } else {
    staleQueued.forEach(j =>
      console.log(' ', j._id, '|', j.originalName, '|', j.status, '|', j.queueNumber)
    );
  }

  // 2. Check done/collected jobs still carrying a queueNumber
  const staleNumbers = await Job.find(
    {
      status: { $in: ['done', 'collected', 'failed', 'cancelled', 'uploaded', 'paid'] },
      queueNumber: { $ne: null },
    },
    'originalName status queueNumber'
  );
  console.log('\n--- Done/collected jobs still with queueNumber ---');
  if (staleNumbers.length === 0) {
    console.log('None found — DB is clean ✅');
  } else {
    staleNumbers.forEach(j =>
      console.log(' ', j._id, '|', j.originalName, '|', j.status, '|', j.queueNumber)
    );
    const result = await Job.updateMany(
      { status: { $in: ['done', 'collected', 'failed', 'cancelled', 'uploaded', 'paid'] } },
      { $set: { queueNumber: null, queuePosition: null } }
    );
    console.log(`✅ Cleaned ${result.modifiedCount} jobs`);
  }

  console.log('\nDone.\n');
  await mongoose.disconnect();
}).catch(err => {
  console.error('DB error:', err.message);
  process.exit(1);
});
