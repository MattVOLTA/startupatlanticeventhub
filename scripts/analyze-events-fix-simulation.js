import 'dotenv/config';

// Simulate the issue and the fix without connecting to any real database
// This is for demonstrating the logic problem and solution only

// This simulates our existing database events for an organization
const MOCK_DB_EVENTS = [
  { id: "111", name: "Event 1" },
  { id: "222", name: "Event 2" },
  { id: "333", name: "Event 3" }
];

// First, we'll simulate what happens in the current code
// when there's an API error from Eventbrite

console.log("🧪 SIMULATION: CURRENT CODE WITH EVENTBRITE API ERROR");
console.log("===================================================");

function simulateCurrentBehavior() {
  // Simulate eventIds from our database
  const eventIds = MOCK_DB_EVENTS.map(event => event.id);
  console.log(`Database contains these events: ${eventIds.join(', ')}`);
  
  // Simulate getEventbriteEventIds() failing with an API error and returning []
  const liveEventIds = [];
  console.log(`API error occurred, liveEventIds is empty: ${JSON.stringify(liveEventIds)}`);
  
  // Current problematic code: Keep any events NOT in liveEventIds (all of them when API fails)
  const cancelledEvents = eventIds.filter(id => !liveEventIds.includes(id));
  
  console.log(`Events marked for deletion: ${cancelledEvents.join(', ')}`);
  console.log(`Would delete ${cancelledEvents.length} out of ${eventIds.length} events`);
  
  if (cancelledEvents.length === eventIds.length) {
    console.log("❌ ISSUE DETECTED: All events would be deleted because of API error!");
  }
}

simulateCurrentBehavior();

// Now, let's simulate the fixed behavior that checks for API errors

console.log("\n\n🧪 SIMULATION: FIXED CODE WITH EVENTBRITE API ERROR");
console.log("===================================================");

function simulateFixedBehavior() {
  // Simulate eventIds from our database
  const eventIds = MOCK_DB_EVENTS.map(event => event.id);
  console.log(`Database contains these events: ${eventIds.join(', ')}`);
  
  // Simulate getEventbriteEventIds() failing with an API error
  const apiSuccess = false;
  const liveEventIds = [];
  
  console.log(`API error occurred, apiSuccess=${apiSuccess}`);
  
  // Fixed code: Only filter for deletion if API call was successful
  if (apiSuccess) {
    const cancelledEvents = eventIds.filter(id => !liveEventIds.includes(id));
    console.log(`Events marked for deletion: ${cancelledEvents.join(', ')}`);
    console.log(`Would delete ${cancelledEvents.length} out of ${eventIds.length} events`);
  } else {
    console.log("✅ FIXED: No events deleted because API call failed");
  }
}

simulateFixedBehavior();

// Finally, let's simulate the correct behavior with a successful API call

console.log("\n\n🧪 SIMULATION: FIXED CODE WITH SUCCESSFUL API CALL");
console.log("===================================================");

function simulateSuccessfulCall() {
  // Simulate eventIds from our database
  const eventIds = MOCK_DB_EVENTS.map(event => event.id);
  console.log(`Database contains these events: ${eventIds.join(', ')}`);
  
  // Simulate getEventbriteEventIds() succeeding but Event 2 is cancelled in Eventbrite
  const apiSuccess = true;
  const liveEventIds = ["111", "333"]; // Event 222 is missing (cancelled)
  
  console.log(`API call successful, found live events: ${liveEventIds.join(', ')}`);
  
  // Fixed code: Only filter for deletion if API call was successful
  if (apiSuccess) {
    const cancelledEvents = eventIds.filter(id => !liveEventIds.includes(id));
    console.log(`Events marked for deletion: ${cancelledEvents.join(', ')}`);
    console.log(`Would delete ${cancelledEvents.length} out of ${eventIds.length} events`);
  } else {
    console.log("No events deleted because API call failed");
  }
}

simulateSuccessfulCall();

// THE FIX for analyze-events.js would be:
/*
async function removeDeletedOrCancelledEvents() {
  // ...existing code...
  
  // For each organization, fetch their events from Eventbrite and compare
  let cancelledEventsCount = 0;
  for (const [orgId, eventIds] of Object.entries(eventsByOrg)) {
    const eventbriteId = orgIdToEventbriteId[orgId];
    if (!eventbriteId) continue;
    
    try {
      // We'll check for events with status 'canceled', 'draft', or missing altogether
      const { success, eventIds: liveEventIds } = await getEventbriteEventIds(eventbriteId);
      
      // Only process cancellations if the API call was successful
      if (success) {
        // Find which events in our DB are no longer in Eventbrite's list of live events
        const cancelledEvents = eventIds.filter(id => !liveEventIds.includes(id));
        
        if (cancelledEvents.length > 0) {
          console.log(`Found ${cancelledEvents.length} cancelled/removed events for organization ${orgId}`);
          
          // Remove these events from our database
          const { error: deleteError } = await supabase
            .from('events')
            .delete()
            .in('id', cancelledEvents);
          
          if (deleteError) {
            console.error('Error deleting cancelled events:', deleteError);
          } else {
            cancelledEventsCount += cancelledEvents.length;
            console.log(`Successfully removed ${cancelledEvents.length} cancelled events`);
          }
        }
      } else {
        console.log(`Skipping cancellation check for organization ${orgId} due to API error`);
      }
    } catch (error) {
      console.error(`Error checking events for organization ${orgId}:`, error);
    }
  }
  
  // ...rest of the code...
}

// Helper function to get event IDs from Eventbrite for a specific organizer
async function getEventbriteEventIds(organizerId) {
  // ...existing code...
  
  try {
    // ...existing code...
    
    if (!response.ok) {
      console.error(`Error fetching events for organizer ${organizerId}: ${response.status}`);
      // Return an object with success flag and empty array
      return { success: false, eventIds: [] };
    }
    
    const data = await response.json();
    console.log(`Found ${data.events?.length || 0} live events for organizer ${organizerId}`);
    // Return success flag and event IDs
    return { 
      success: true, 
      eventIds: (data.events || []).map(event => event.id)
    };
  } catch (error) {
    console.error(`Error fetching Eventbrite events for organizer ${organizerId}:`, error);
    // Return failure and empty array
    return { success: false, eventIds: [] };
  }
}
*/ 