import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';

const BACKGROUND_LOCATION_TASK = 'BNBKitBackgroundLocation';
const SERVER_URL = 'https://5b70e398-26eb-4d7d-9586-6be5b65229cd-00-3gcmy6q53pmg4.worf.replit.dev';

// Define the background task - QUESTO È FONDAMENTALE!
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  
  if (data) {
    const { locations } = data;
    
    // Process each location update
    for (const location of locations || []) {
      try {
        await fetch(`${SERVER_URL}/api/positions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            driverId: 'NATIVE_APP',
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            speed: location.coords.speed || 0,
            timestamp: new Date(location.timestamp).toISOString()
          })
        });
        
        console.log('📍 Background location sent:', {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          time: new Date(location.timestamp).toLocaleTimeString()
        });
      } catch (error) {
        console.error('Failed to send background location:', error);
      }
    }
  }
});

export { BACKGROUND_LOCATION_TASK };
