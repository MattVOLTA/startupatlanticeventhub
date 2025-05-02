import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const EVENTBRITE_TOKEN = process.env.VITE_EVENTBRITE_TOKEN;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !EVENTBRITE_TOKEN) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper function to get event IDs from Eventbrite for a specific organizer
async function getEventbriteEventIds(organizerId) {
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

async function checkForCancelledEvents() {
  console.log('🧪 RUNNING CANCELLED EVENT CHECK (DRY RUN MODE) 🧪');
  console.log('===================================================');
  console.log('This is a dry run - no events will be deleted\n');
  
  // First, get all events in our database with their organization IDs
  const { data: dbEvents, error: dbError } = await supabase
    .from('events')
    .select('id, name, organization_id, start_date')
    .gte('end_date', new Date().toISOString()); // Only consider future and current events
  
  if (dbError) {
    console.error('Error fetching events from database:', dbError);
    return;
  }
  
  if (!dbEvents || dbEvents.length === 0) {
    console.log('No future events in the database to check');
    return;
  }
  
  console.log(`Found ${dbEvents.length} future events in the database\n`);
  
  // Safety config for deletion limits
  const SAFETY_CONFIG = {
    // Maximum percentage of events that can be deleted for a single organization
    maxDeletionPercentage: 40, // 40% is a reasonable limit
    
    // Minimum number of live events required from Eventbrite to proceed with deletion
    minLiveEvents: 1,
    
    // This is always true for this script - it's a dry run
    dryRun: true
  };
  
  // Group events by organization to minimize API calls
  const eventsByOrg = dbEvents.reduce((acc, event) => {
    if (!event.organization_id) return acc;
    if (!acc[event.organization_id]) acc[event.organization_id] = [];
    acc[event.organization_id].push(event);
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
  
  // Prepare results containers
  let totalCancelledEvents = 0;
  const cancelledEventsByOrg = {};
  
  // For each organization, fetch their events from Eventbrite and compare
  for (const [orgId, events] of Object.entries(eventsByOrg)) {
    const eventbriteId = orgIdToEventbriteId[orgId];
    const orgName = orgNames[orgId] || orgId;
    const eventIds = events.map(e => e.id);
    
    if (!eventbriteId) {
      console.log(`Skipping organization ${orgName} - No Eventbrite ID found`);
      continue;
    }
    
    console.log(`\nProcessing ${orgName} (Eventbrite ID: ${eventbriteId})...`);
    console.log(`Found ${events.length} events in database for this organization`);
    
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
        const cancelledEventIds = eventIds.filter(id => !liveEventIds.includes(id));
        
        if (cancelledEventIds.length > 0) {
          // Get the full event details for the cancelled events
          const cancelledEvents = events.filter(e => cancelledEventIds.includes(e.id));
          cancelledEventsByOrg[orgName] = cancelledEvents;
          
          console.log(`Found ${cancelledEventIds.length} cancelled/removed events for ${orgName}:`);
          
          // Display information about each cancelled event
          cancelledEvents.forEach((event, index) => {
            const eventDate = new Date(event.start_date).toLocaleDateString();
            console.log(`  ${index + 1}. ${event.name} (${eventDate})`);
          });
          
          // SAFETY: Calculate the percentage of events being deleted
          const deletionPercentage = (cancelledEventIds.length / eventIds.length) * 100;
          
          // SAFETY: Check if the deletion percentage exceeds our limit
          if (deletionPercentage > SAFETY_CONFIG.maxDeletionPercentage) {
            console.log(`⚠️ SAFETY: Would delete ${deletionPercentage.toFixed(1)}% of events for ${orgName}, which exceeds limit of ${SAFETY_CONFIG.maxDeletionPercentage}%`);
            console.log(`Cancellation check would be aborted for ${orgName} in real run`);
          } else {
            console.log(`DRY RUN: Would delete ${cancelledEventIds.length} events for ${orgName}`);
            totalCancelledEvents += cancelledEventIds.length;
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
  
  // Print summary
  console.log('\n===================================================');
  console.log('DRY RUN SUMMARY:');
  console.log(`Total cancelled events identified: ${totalCancelledEvents}`);
  console.log('===================================================');
  
  // If any cancelled events were found, list them by organization
  if (totalCancelledEvents > 0) {
    console.log('\nDetailed list of cancelled events by organization:');
    for (const [orgName, events] of Object.entries(cancelledEventsByOrg)) {
      console.log(`\n${orgName} (${events.length} events):`);
      events.forEach((event, index) => {
        const eventDate = new Date(event.start_date).toLocaleDateString();
        console.log(`  ${index + 1}. ${event.name} (${eventDate})`);
      });
    }
  }
  
  console.log('\nDRY RUN COMPLETED - No events were deleted');
}

// Run the check
checkForCancelledEvents().catch(console.error); 