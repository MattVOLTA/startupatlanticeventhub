import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment variables check
const EVENTBRITE_TOKEN = process.env.VITE_EVENTBRITE_TOKEN;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY;

if (!EVENTBRITE_TOKEN || !SUPABASE_URL || !SUPABASE_ANON_KEY || !OPENAI_API_KEY) {
  console.error('❌ Missing required environment variables');
  console.log('Please make sure the following variables are set:');
  console.log('- VITE_EVENTBRITE_TOKEN');
  console.log('- VITE_SUPABASE_URL');
  console.log('- VITE_SUPABASE_ANON_KEY');
  console.log('- VITE_OPENAI_API_KEY');
  process.exit(1);
}

// Initialize Supabase client for our test verification
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test mode configuration
const TEST_MODE = {
  // Set this to true to use a test database table instead of production
  useTestTable: false,
  
  // Test organization ID to limit scope (Volta in this case)
  testOrganizerId: '3570959959',
  
  // Log the OpenAI requests but don't actually make them
  mockOpenAI: false,
  
  // Number of events to process (limit for testing)
  eventLimit: 5
};

// Create a backup of current .last_analysis_run file if it exists
async function backupLastRunFile() {
  const fs = await import('fs/promises');
  const lastRunFile = path.join(process.cwd(), '.last_analysis_run');
  
  try {
    // Check if file exists
    await fs.access(lastRunFile);
    
    // Backup the file
    const backupFile = `${lastRunFile}.backup`;
    await fs.copyFile(lastRunFile, backupFile);
    console.log(`✅ Backed up .last_analysis_run file to ${backupFile}`);
    
    // Optionally modify the timestamp to force processing more events
    // This is useful for testing the analysis on recent events
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    await fs.writeFile(lastRunFile, threeDaysAgo.toISOString());
    console.log(`✅ Set last run timestamp to 3 days ago for testing`);
  } catch (error) {
    // File doesn't exist, create it with a date from 3 days ago
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    await fs.writeFile(lastRunFile, threeDaysAgo.toISOString());
    console.log(`✅ Created .last_analysis_run file with timestamp from 3 days ago`);
  }
}

// Restore the backup when done
async function restoreLastRunFile() {
  const fs = await import('fs/promises');
  const lastRunFile = path.join(process.cwd(), '.last_analysis_run');
  const backupFile = `${lastRunFile}.backup`;
  
  try {
    // Check if backup exists
    await fs.access(backupFile);
    
    // Restore the backup
    await fs.copyFile(backupFile, lastRunFile);
    console.log(`✅ Restored original .last_analysis_run file`);
    
    // Delete backup
    await fs.unlink(backupFile);
  } catch (error) {
    // No backup exists, just delete the temporary file
    try {
      await fs.unlink(lastRunFile);
      console.log(`✅ Removed temporary .last_analysis_run file`);
    } catch (err) {
      // File may not exist, ignore
    }
  }
}

// Function to add a fake cancelled event for testing the removal functionality
async function addFakeCancelledEvent() {
  if (!TEST_MODE.useTestTable) {
    // Safety check to avoid modifying production data accidentally
    console.log('⚠️ Skipping fake cancelled event creation in production mode');
    return null;
  }
  
  // Create a fake event with a random ID that won't exist in Eventbrite
  const fakeEventId = `fake-${Date.now()}`;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);
  
  // Get a valid organization ID from the database
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id')
    .eq('eventbrite_id', TEST_MODE.testOrganizerId)
    .limit(1);
  
  if (!orgs || orgs.length === 0) {
    console.log('❌ Could not find test organization');
    return null;
  }
  
  const organizationId = orgs[0].id;
  
  // Insert fake event
  const { data, error } = await supabase
    .from('events')
    .insert({
      id: fakeEventId,
      name: 'TEST - Fake Event for Cancellation Testing',
      description: 'This is a test event that should be removed by the cancellation check',
      start_date: tomorrow.toISOString(),
      end_date: dayAfter.toISOString(),
      url: 'https://example.com/fake-event',
      organization_id: organizationId,
      venue_name: 'Test Venue',
      is_online: false
    })
    .select();
  
  if (error) {
    console.error('❌ Error creating fake cancelled event:', error);
    return null;
  }
  
  console.log(`✅ Created fake cancelled event with ID: ${fakeEventId}`);
  return fakeEventId;
}

// Function to verify if the cancelled event was removed
async function verifyEventRemoval(eventId) {
  if (!eventId) return;
  
  const { data, error } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId);
  
  if (error) {
    console.error('❌ Error checking for fake event removal:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('❌ Fake cancelled event was NOT removed correctly');
  } else {
    console.log('✅ Fake cancelled event was removed successfully');
  }
}

// Function to run a script and capture its output
function runScript(scriptPath, envVars = {}) {
  return new Promise((resolve, reject) => {
    // Merge environment variables
    const env = { ...process.env, ...envVars };
    
    // Run the script
    const child = spawn('node', [scriptPath], {
      env,
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    let output = '';
    
    // Capture and log standard output
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (data) => {
      output += data;
      process.stdout.write(data);
    });
    
    // Capture and log error output
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (data) => {
      output += data;
      process.stderr.write(data);
    });
    
    // Handle completion
    child.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Script exited with code ${code}`));
      }
    });
  });
}

// Main test function
async function runTest() {
  try {
    console.log('🧪 STARTING EVENT ANALYSIS TEST 🧪');
    console.log('==================================');
    
    // 1. Backup current state
    await backupLastRunFile();
    
    // 2. Add a fake cancelled event (only in test mode)
    const fakeEventId = await addFakeCancelledEvent();
    
    // 3. Set up test env vars
    const testEnvVars = {};
    if (TEST_MODE.mockOpenAI) {
      testEnvVars.MOCK_OPENAI = 'true';
    }
    if (TEST_MODE.useTestTable) {
      testEnvVars.USE_TEST_TABLES = 'true';
    }
    if (TEST_MODE.eventLimit) {
      testEnvVars.EVENT_LIMIT = TEST_MODE.eventLimit.toString();
    }
    if (TEST_MODE.testOrganizerId) {
      testEnvVars.TEST_ORGANIZER_ID = TEST_MODE.testOrganizerId;
    }
    
    // 4. Run the analyze-events script
    console.log('\n📋 RUNNING EVENT ANALYSIS');
    console.log('==================================');
    await runScript(path.join(__dirname, 'analyze-events.js'), testEnvVars);
    
    // 5. Verify the results
    if (fakeEventId) {
      console.log('\n📋 VERIFYING CANCELLED EVENT REMOVAL');
      console.log('==================================');
      await verifyEventRemoval(fakeEventId);
    }
    
    console.log('\n✅ TEST COMPLETED SUCCESSFULLY');
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
  } finally {
    // Always clean up
    await restoreLastRunFile();
    console.log('\n🧹 Test cleanup completed');
  }
}

// Check if this script is being run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runTest().catch(console.error);
}

export { runTest }; 