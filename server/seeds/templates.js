require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose  = require('mongoose');
const Template  = require('../models/Template');

const PRESETS = [
  {
    name: 'Family Ajo',
    description: 'Classic family savings circle with fixed payout rotation',
    icon: '👨‍👩‍👧‍👦',
    settings: { contributionAmount: 20000, dueDay: 25, graceDays: 3, rotationType: 'fixed' },
  },
  {
    name: 'Office Thrift',
    description: 'Workplace savings club — first to join gets paid first',
    icon: '🏢',
    settings: { contributionAmount: 10000, dueDay: 28, graceDays: 2, rotationType: 'join-order' },
  },
  {
    name: 'Church Circle',
    description: 'Community savings with fair random rotation',
    icon: '⛪',
    settings: { contributionAmount: 5000, dueDay: 1, graceDays: 5, rotationType: 'random' },
  },
  {
    name: 'Friends Esusu',
    description: 'Small group of friends with manual payout order',
    icon: '🤝',
    settings: { contributionAmount: 15000, dueDay: 20, graceDays: 3, rotationType: 'fixed' },
  },
  {
    name: 'Market Women',
    description: 'High-contribution traders circle with join-order priority',
    icon: '🛒',
    settings: { contributionAmount: 30000, dueDay: 15, graceDays: 2, rotationType: 'join-order' },
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  for (const preset of PRESETS) {
    const exists = await Template.findOne({ name: preset.name, isPreset: true });
    if (exists) {
      console.log(`  SKIP  "${preset.name}" (already exists)`);
      continue;
    }
    await Template.create({ ...preset, isPreset: true, createdBy: null });
    console.log(`  ADDED "${preset.name}"`);
  }

  console.log('Seed complete.');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
