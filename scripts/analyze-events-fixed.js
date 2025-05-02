// This file contains the fixed implementation of analyze-events.js
// This is a safe copy that can be reviewed before replacing the original file

// 1. Add the success flag to getEventbriteEventIds
// 2. Only process cancellations when API call succeeds
// 3. Add additional safety measures

async function removeDeletedOrCancelledEvents() {
  // Code to replace the existing function in analyze-events.js
  
  // First, get all events in our database with their organization IDs
  const { data: dbEvents, error: dbError } = await supabase
    .from('events')
    .select('id, organization_id')
    .gte('end_date', new Date().toISOString()); // Only consider future and current events
  
  if (dbError) {
    console.error('Error fetching events from database:', dbError);
    return;
  }
  
  if (!dbEvents || dbEvents.length === 0) {
    console.log('No future events in the database to check');
    return;
  }
  
  console.log(`Checking ${dbEvents.length} future events to find cancelled ones...`);
  
  // Safety config for deletion limits
  const SAFETY_CONFIG = {
    // Maximum percentage of events that can be deleted for a single organization
    maxDeletionPercentage: 40, // 40% is a reasonable limit
    
    // Minimum number of live events required from Eventbrite to proceed with deletion
    minLiveEvents: 1,
    
    // Add a dry run mode for testing (set to false for actual deletion)
    dryRun: false
  };
  
  if (SAFETY_CONFIG.dryRun) {
    console.log('⚠️ RUNNING IN DRY RUN MODE - Events will not be deleted');
  }
  
  // Group events by organization to minimize API calls
  const eventsByOrg = dbEvents.reduce((acc, event) => {
    if (!event.organization_id) return acc;
    if (!acc[event.organization_id]) acc[event.organization_id] = [];
    acc[event.organization_id].push(event.id);
    return acc;
  }, {});
  
  // Get list of organizations
  const { data: organizations, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, eventbrite_id');
  
  if (orgError) {
    console.error('Error fetching organizations:', orgError);
    return;
  }
  
  // Create a map of organization UUID to Eventbrite ID
  const orgIdToEventbriteId = {};
  const orgNames = {};
  for (const org of organizations) {
    orgIdToEventbriteId[org.id] = org.eventbrite_id;
    orgNames[org.id] = org.name;
  }
  
  // For each organization, fetch their events from Eventbrite and compare
  let cancelledEventsCount = 0;
  for (const [orgId, eventIds] of Object.entries(eventsByOrg)) {
    const eventbriteId = orgIdToEventbriteId[orgId];
    const orgName = orgNames[orgId] || orgId;
    
    if (!eventbriteId) {
      console.log(`Skipping organization ${orgName} - No Eventbrite ID found`);
      continue;
    }
    
    console.log(`\nProcessing ${orgName} (Eventbrite ID: ${eventbriteId})...`);
    console.log(`Found ${eventIds.length} events in database for this organization`);
    
    try {
      // Get events from Eventbrite with success flag
      const { success, eventIds: liveEventIds } = await getEventbriteEventIds(eventbriteId);
      
      // Only process cancellations if the API call was successful
      if (success) {
        // SAFETY: Check if we have minimum required number of live events
        if (liveEventIds.length < SAFETY_CONFIG.minLiveEvents) {
          console.log(`⚠️ SAFETY: Found fewer than ${SAFETY_CONFIG.minLiveEvents} live events, skipping cancellation check`);
          continue;
        }
        
        // Find which events in our DB are no longer in Eventbrite's list of live events
        const cancelledEvents = eventIds.filter(id => !liveEventIds.includes(id));
        
        if (cancelledEvents.length > 0) {
          console.log(`Found ${cancelledEvents.length} cancelled/removed events for ${orgName}`);
          
          // SAFETY: Calculate the percentage of events being deleted
          const deletionPercentage = (cancelledEvents.length / eventIds.length) * 100;
          
          // SAFETY: Check if the deletion percentage exceeds our limit
          if (deletionPercentage > SAFETY_CONFIG.maxDeletionPercentage) {
            console.log(`⚠️ SAFETY: Would delete ${deletionPercentage.toFixed(1)}% of events for ${orgName}, which exceeds limit of ${SAFETY_CONFIG.maxDeletionPercentage}%`);
            console.log(`Cancellation check aborted for ${orgName}`);
            continue;
          }
          
          // Only delete if not in dry run mode
          if (!SAFETY_CONFIG.dryRun) {
            // Remove these events from our database
            const { error: deleteError } = await supabase
              .from('events')
              .delete()
              .in('id', cancelledEvents);
            
            if (deleteError) {
              console.error(`Error deleting cancelled events for ${orgName}:`, deleteError);
            } else {
              cancelledEventsCount += cancelledEvents.length;
              console.log(`✓ Successfully removed ${cancelledEvents.length} cancelled events`);
            }
          } else {
            console.log(`DRY RUN: Would delete ${cancelledEvents.length} events for ${orgName}`);
          }
        } else {
          console.log(`No cancelled events found for ${orgName}`);
        }
      } else {
        // Skip this organization if API call failed
        console.log(`⚠️ Skipping cancellation check for ${orgName} due to API error`);
      }
    } catch (error) {
      console.error(`Error checking events for ${orgName}:`, error);
    }
  }
  
  if (SAFETY_CONFIG.dryRun) {
    console.log(`\nDRY RUN COMPLETED: Would have removed ${cancelledEventsCount} cancelled events`);
  } else {
    console.log(`\nTotal cancelled events removed: ${cancelledEventsCount}`);
  }
}

// Helper function to get event IDs from Eventbrite for a specific organizer
async function getEventbriteEventIds(organizerId) {
  // Code to replace the existing function in analyze-events.js
  
  const now = new Date();
  const sixMonthsFromNow = new Date();
  sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
  
  const params = new URLSearchParams({
    order_by: 'start_asc',
    'start_date.range_start': now.toISOString().split('.')[0] + 'Z',
    'start_date.range_end': sixMonthsFromNow.toISOString().split('.')[0] + 'Z',
    status: 'live,started,ended' // Only get active events
  });
  
  try {
    // Get Eventbrite token from environment variables
    const EVENTBRITE_TOKEN = process.env.VITE_EVENTBRITE_TOKEN;
    if (!EVENTBRITE_TOKEN) {
      console.error('Missing Eventbrite token');
      return { success: false, eventIds: [] };
    }
    
    console.log(`Fetching events for organizer ${organizerId}...`);
    const response = await fetch(
      `https://www.eventbriteapi.com/v3/organizers/${organizerId}/events/?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${EVENTBRITE_TOKEN}`
        }
      }
    );
    
    if (!response.ok) {
      if (response.status === 404) {
        console.error(`Organizer ${organizerId} not found`);
      } else if (response.status === 401) {
        console.error('Unauthorized: Check your Eventbrite token');
      } else {
        console.error(`Error fetching events for organizer ${organizerId}: ${response.status}`);
        try {
          const errorText = await response.text();
          console.error(`Error details: ${errorText}`);
        } catch (e) {
          // Ignore if we can't parse error details
        }
      }
      // Return failure flag and empty array
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
    // Return failure flag and empty array
    return { success: false, eventIds: [] };
  }
}

// NOTE: To use this fix, replace the corresponding functions in your analyze-events.js file
// or backup your original file and rename this one to analyze-events.js 