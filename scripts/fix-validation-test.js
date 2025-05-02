import 'dotenv/config';

// =============================================================
// SIMULATION SCRIPT - COMPLETELY SAFE, NO DB CONNECTIONS MADE
// =============================================================

// Mock database with fake events for multiple organizations
const MOCK_DB = {
  organizations: [
    { id: 'org-1', name: 'Volta', eventbrite_id: '3570959959' },
    { id: 'org-2', name: 'ACENET', eventbrite_id: '16982059077' },
    { id: 'org-3', name: 'Invalid Org', eventbrite_id: 'invalid-id' }
  ],
  events: [
    // Volta events
    { id: 'evt-101', name: 'Tech Meetup', organization_id: 'org-1' },
    { id: 'evt-102', name: 'Startup Weekend', organization_id: 'org-1' },
    { id: 'evt-103', name: 'Pitch Night', organization_id: 'org-1' },
    // ACENET events
    { id: 'evt-201', name: 'Data Workshop', organization_id: 'org-2' },
    { id: 'evt-202', name: 'ML Conference', organization_id: 'org-2' },
    // Invalid Org events
    { id: 'evt-301', name: 'Cancelled Event', organization_id: 'org-3' }
  ]
};

// Mock API responses for different scenarios
const MOCK_API_RESPONSES = {
  // Successful response with some events cancelled
  '3570959959': {
    success: true,
    status: 200,
    data: {
      events: [
        { id: 'evt-101' }, // Tech Meetup is active
        { id: 'evt-103' }  // Pitch Night is active
                          // Startup Weekend is cancelled (missing)
      ]
    }
  },
  // Successful response with all events active
  '16982059077': {
    success: true,
    status: 200,
    data: {
      events: [
        { id: 'evt-201' },
        { id: 'evt-202' }
      ]
    }
  },
  // API error response
  'invalid-id': {
    success: false,
    status: 400,
    error: 'Invalid organizer ID'
  }
};

// Mock EventBrite API client
class MockEventbriteClient {
  async getEvents(organizerId) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Return mocked response based on organizerId
    const response = MOCK_API_RESPONSES[organizerId];
    if (!response) {
      return { success: false, status: 404, error: 'Not found' };
    }
    return response;
  }
}

// Mock Supabase client
class MockSupabaseClient {
  constructor(mockDb) {
    this.db = JSON.parse(JSON.stringify(mockDb)); // Deep clone the mock DB
    this.deletedEvents = []; // Track deleted events
  }
  
  // Simulated query builder
  from(table) {
    const self = this;
    
    return {
      select: (columns) => {
        return {
          eq: (column, value) => {
            const results = this.db[table].filter(item => item[column] === value);
            return { data: results, error: null };
          },
          in: (column, values) => {
            const results = this.db[table].filter(item => values.includes(item[column]));
            return { data: results, error: null };
          }
        };
      },
      delete: () => {
        return {
          in: (column, values) => {
            // Track which events would be deleted
            const toDelete = this.db[table].filter(item => values.includes(item[column]));
            this.deletedEvents.push(...toDelete);
            
            return { 
              data: { count: toDelete.length },
              error: null 
            };
          },
          eq: (column, value) => {
            const toDelete = this.db[table].filter(item => item[column] === value);
            this.deletedEvents.push(...toDelete);
            
            return { 
              data: { count: toDelete.length },
              error: null 
            };
          }
        };
      }
    };
  }
  
  // Get all deleted events
  getDeletedEvents() {
    return this.deletedEvents;
  }
}

// SIMULATION FUNCTIONS

// Original implementation with the bug (deletes everything on API error)
async function simulateOriginalImplementation() {
  console.log("\n🧪 SIMULATION 1: ORIGINAL IMPLEMENTATION (WITH BUG)");
  console.log("========================================================");
  
  const eventbriteClient = new MockEventbriteClient();
  const supabase = new MockSupabaseClient(MOCK_DB);
  
  // Group events by organization
  const eventsByOrg = {};
  for (const event of MOCK_DB.events) {
    if (!eventsByOrg[event.organization_id]) {
      eventsByOrg[event.organization_id] = [];
    }
    eventsByOrg[event.organization_id].push(event.id);
  }
  
  // Create mapping of org IDs to Eventbrite IDs
  const orgIdToEventbriteId = {};
  for (const org of MOCK_DB.organizations) {
    orgIdToEventbriteId[org.id] = org.eventbrite_id;
  }
  
  console.log("Starting cancelled events check...");
  console.log(`Found ${MOCK_DB.events.length} events across ${MOCK_DB.organizations.length} organizations`);
  
  // For each organization, check for cancelled events
  let cancelledEventsCount = 0;
  
  for (const [orgId, eventIds] of Object.entries(eventsByOrg)) {
    const eventbriteId = orgIdToEventbriteId[orgId];
    if (!eventbriteId) continue;
    
    const org = MOCK_DB.organizations.find(o => o.id === orgId);
    console.log(`\nChecking events for ${org.name} (ID: ${eventbriteId})...`);
    console.log(`Database has ${eventIds.length} events for this organization`);
    
    try {
      // Original implementation: Get events from Eventbrite
      const apiResponse = await eventbriteClient.getEvents(eventbriteId);
      
      // Extract event IDs (or empty array on error)
      let liveEventIds = [];
      if (apiResponse.success && apiResponse.data?.events) {
        liveEventIds = apiResponse.data.events.map(e => e.id);
        console.log(`API returned ${liveEventIds.length} active events`);
      } else {
        console.log(`API error: ${apiResponse.error || 'Unknown error'}`);
        // ORIGINAL BUG: No special handling for API errors, liveEventIds remains empty
      }
      
      // THE BUG: This filter treats all events as cancelled when liveEventIds is empty
      const cancelledEvents = eventIds.filter(id => !liveEventIds.includes(id));
      
      if (cancelledEvents.length > 0) {
        console.log(`Found ${cancelledEvents.length} cancelled events`);
        
        // Simulate deleting the events
        const { data: deleteResult } = await supabase
          .from('events')
          .delete()
          .in('id', cancelledEvents);
          
        cancelledEventsCount += cancelledEvents.length;
      } else {
        console.log(`No cancelled events found`);
      }
    } catch (error) {
      console.error(`Error checking events: ${error}`);
    }
  }
  
  // Show summary
  const deletedEvents = supabase.getDeletedEvents();
  console.log("\nSIMULATION RESULTS:");
  console.log(`Total events deleted: ${deletedEvents.length} out of ${MOCK_DB.events.length}`);
  
  // Show deleted events by organization
  const deletedByOrg = {};
  for (const event of deletedEvents) {
    if (!deletedByOrg[event.organization_id]) {
      deletedByOrg[event.organization_id] = [];
    }
    deletedByOrg[event.organization_id].push(event);
  }
  
  for (const orgId in deletedByOrg) {
    const org = MOCK_DB.organizations.find(o => o.id === orgId);
    const orgEvents = MOCK_DB.events.filter(e => e.organization_id === orgId);
    console.log(`- ${org.name}: ${deletedByOrg[orgId].length}/${orgEvents.length} events deleted`);
    
    // Is this a problem case? (all events for an org deleted)
    if (deletedByOrg[orgId].length === orgEvents.length) {
      console.log(`  ❌ ISSUE: All events deleted for ${org.name} (likely due to API error)`);
    }
  }
}

// Fixed implementation (only deletes when API succeeds)
async function simulateFixedImplementation() {
  console.log("\n🧪 SIMULATION 2: FIXED IMPLEMENTATION");
  console.log("========================================================");
  
  const eventbriteClient = new MockEventbriteClient();
  const supabase = new MockSupabaseClient(MOCK_DB);
  
  // Group events by organization
  const eventsByOrg = {};
  for (const event of MOCK_DB.events) {
    if (!eventsByOrg[event.organization_id]) {
      eventsByOrg[event.organization_id] = [];
    }
    eventsByOrg[event.organization_id].push(event.id);
  }
  
  // Create mapping of org IDs to Eventbrite IDs
  const orgIdToEventbriteId = {};
  for (const org of MOCK_DB.organizations) {
    orgIdToEventbriteId[org.id] = org.eventbrite_id;
  }
  
  console.log("Starting cancelled events check...");
  console.log(`Found ${MOCK_DB.events.length} events across ${MOCK_DB.organizations.length} organizations`);
  
  // For each organization, check for cancelled events
  let cancelledEventsCount = 0;
  
  for (const [orgId, eventIds] of Object.entries(eventsByOrg)) {
    const eventbriteId = orgIdToEventbriteId[orgId];
    if (!eventbriteId) continue;
    
    const org = MOCK_DB.organizations.find(o => o.id === orgId);
    console.log(`\nChecking events for ${org.name} (ID: ${eventbriteId})...`);
    console.log(`Database has ${eventIds.length} events for this organization`);
    
    try {
      // Get events from Eventbrite
      const apiResponse = await eventbriteClient.getEvents(eventbriteId);
      
      // FIXED IMPLEMENTATION: Check API success before processing events
      if (apiResponse.success && apiResponse.data?.events) {
        const liveEventIds = apiResponse.data.events.map(e => e.id);
        console.log(`API returned ${liveEventIds.length} active events`);
        
        // Only filter for cancelled events if API call was successful
        const cancelledEvents = eventIds.filter(id => !liveEventIds.includes(id));
        
        if (cancelledEvents.length > 0) {
          console.log(`Found ${cancelledEvents.length} cancelled events`);
          
          // Simulate deleting the events
          const { data: deleteResult } = await supabase
            .from('events')
            .delete()
            .in('id', cancelledEvents);
            
          cancelledEventsCount += cancelledEvents.length;
        } else {
          console.log(`No cancelled events found`);
        }
      } else {
        // FIXED: Skip cancellation processing on API error
        console.log(`API error: ${apiResponse.error || 'Unknown error'}`);
        console.log(`Skipping cancellation check due to API error`);
      }
    } catch (error) {
      console.error(`Error checking events: ${error}`);
    }
  }
  
  // Show summary
  const deletedEvents = supabase.getDeletedEvents();
  console.log("\nSIMULATION RESULTS:");
  console.log(`Total events deleted: ${deletedEvents.length} out of ${MOCK_DB.events.length}`);
  
  // Show deleted events by organization
  const deletedByOrg = {};
  for (const event of deletedEvents) {
    if (!deletedByOrg[event.organization_id]) {
      deletedByOrg[event.organization_id] = [];
    }
    deletedByOrg[event.organization_id].push(event);
  }
  
  for (const orgId in deletedByOrg) {
    const org = MOCK_DB.organizations.find(o => o.id === orgId);
    const orgEvents = MOCK_DB.events.filter(e => e.organization_id === orgId);
    console.log(`- ${org.name}: ${deletedByOrg[orgId].length}/${orgEvents.length} events deleted`);
  }
}

// Enhanced implementation with additional safety measures
async function simulateEnhancedImplementation() {
  console.log("\n🧪 SIMULATION 3: ENHANCED IMPLEMENTATION WITH SAFEGUARDS");
  console.log("========================================================");
  
  const eventbriteClient = new MockEventbriteClient();
  const supabase = new MockSupabaseClient(MOCK_DB);
  
  // ENHANCED: Configuration for safety limits
  const SAFETY_CONFIG = {
    // Maximum percentage of events that can be deleted in one run
    maxDeletionPercentage: 50,
    
    // Minimum number of live events required to proceed with deletion
    minLiveEvents: 1,
    
    // Dry run mode - log but don't actually delete
    dryRun: false
  };
  
  // Group events by organization
  const eventsByOrg = {};
  for (const event of MOCK_DB.events) {
    if (!eventsByOrg[event.organization_id]) {
      eventsByOrg[event.organization_id] = [];
    }
    eventsByOrg[event.organization_id].push(event.id);
  }
  
  // Create mapping of org IDs to Eventbrite IDs
  const orgIdToEventbriteId = {};
  for (const org of MOCK_DB.organizations) {
    orgIdToEventbriteId[org.id] = org.eventbrite_id;
  }
  
  console.log("Starting cancelled events check with enhanced safeguards...");
  if (SAFETY_CONFIG.dryRun) {
    console.log("⚠️ DRY RUN MODE: Events will not be deleted");
  }
  console.log(`Found ${MOCK_DB.events.length} events across ${MOCK_DB.organizations.length} organizations`);
  
  // For each organization, check for cancelled events
  let cancelledEventsCount = 0;
  
  for (const [orgId, eventIds] of Object.entries(eventsByOrg)) {
    const eventbriteId = orgIdToEventbriteId[orgId];
    if (!eventbriteId) continue;
    
    const org = MOCK_DB.organizations.find(o => o.id === orgId);
    console.log(`\nChecking events for ${org.name} (ID: ${eventbriteId})...`);
    console.log(`Database has ${eventIds.length} events for this organization`);
    
    try {
      // Get events from Eventbrite
      const apiResponse = await eventbriteClient.getEvents(eventbriteId);
      
      // Check API success before processing events
      if (apiResponse.success && apiResponse.data?.events) {
        const liveEventIds = apiResponse.data.events.map(e => e.id);
        console.log(`API returned ${liveEventIds.length} active events`);
        
        // ENHANCED: Check if we have minimum required live events
        if (liveEventIds.length < SAFETY_CONFIG.minLiveEvents) {
          console.log(`⚠️ SAFETY: Found fewer than ${SAFETY_CONFIG.minLiveEvents} live events, skipping cancellation check`);
          continue;
        }
        
        // Only filter for cancelled events if API call was successful
        const cancelledEvents = eventIds.filter(id => !liveEventIds.includes(id));
        
        if (cancelledEvents.length > 0) {
          console.log(`Found ${cancelledEvents.length} cancelled events`);
          
          // ENHANCED: Safety percentage check
          const deletionPercentage = (cancelledEvents.length / eventIds.length) * 100;
          if (deletionPercentage > SAFETY_CONFIG.maxDeletionPercentage) {
            console.log(`⚠️ SAFETY: Would delete ${deletionPercentage.toFixed(1)}% of events, which exceeds limit of ${SAFETY_CONFIG.maxDeletionPercentage}%`);
            console.log(`Cancellation check aborted for ${org.name}`);
            continue;
          }
          
          // Simulate deleting the events (or just log in dry run mode)
          if (!SAFETY_CONFIG.dryRun) {
            const { data: deleteResult } = await supabase
              .from('events')
              .delete()
              .in('id', cancelledEvents);
              
            cancelledEventsCount += cancelledEvents.length;
          } else {
            console.log(`DRY RUN: Would delete ${cancelledEvents.length} events`);
          }
        } else {
          console.log(`No cancelled events found`);
        }
      } else {
        // Skip cancellation processing on API error
        console.log(`API error: ${apiResponse.error || 'Unknown error'}`);
        console.log(`Skipping cancellation check due to API error`);
      }
    } catch (error) {
      console.error(`Error checking events: ${error}`);
    }
  }
  
  // Show summary
  const deletedEvents = SAFETY_CONFIG.dryRun ? [] : supabase.getDeletedEvents();
  console.log("\nSIMULATION RESULTS:");
  if (SAFETY_CONFIG.dryRun) {
    console.log("⚠️ DRY RUN - No actual deletions performed");
  } else {
    console.log(`Total events deleted: ${deletedEvents.length} out of ${MOCK_DB.events.length}`);
  }
  
  // Show deleted events by organization
  if (!SAFETY_CONFIG.dryRun) {
    const deletedByOrg = {};
    for (const event of deletedEvents) {
      if (!deletedByOrg[event.organization_id]) {
        deletedByOrg[event.organization_id] = [];
      }
      deletedByOrg[event.organization_id].push(event);
    }
    
    for (const orgId in deletedByOrg) {
      const org = MOCK_DB.organizations.find(o => o.id === orgId);
      const orgEvents = MOCK_DB.events.filter(e => e.organization_id === orgId);
      console.log(`- ${org.name}: ${deletedByOrg[orgId].length}/${orgEvents.length} events deleted`);
    }
  }
}

// Run all simulations
async function runAllSimulations() {
  console.log("🧪🧪🧪 RUNNING CANCELLED EVENT DETECTION SIMULATIONS 🧪🧪🧪");
  console.log("This simulation is 100% safe and does NOT connect to any real database");
  console.log("=========================================================================");
  
  await simulateOriginalImplementation();
  await simulateFixedImplementation();
  await simulateEnhancedImplementation();
  
  console.log("\n=========================================================================");
  console.log("All simulations completed. No real database operations were performed.");
}

// Run the simulations
runAllSimulations().catch(console.error); 