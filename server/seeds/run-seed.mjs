/**
 * Run Seed Script
 * Execute with: node server/seeds/run-seed.mjs
 */

import { seedPromptTemplates } from './promptSeeds.ts';

async function main() {
  console.log('Starting prompt template seeding...');
  
  try {
    const result = await seedPromptTemplates();
    
    console.log('\n=== Seed Results ===');
    console.log(`Total prompts: ${result.total}`);
    console.log(`Inserted: ${result.inserted}`);
    console.log(`Updated: ${result.updated}`);
    console.log(`Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach(err => console.log(`  - ${err}`));
    }
    
    console.log('\nSeeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

main();
