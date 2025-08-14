import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Nome del task - DEVE essere lo stesso usato in App.js
export const BACKGROUND_LOCATION_TASK = 'BNBKitBackgroundLocation';

// URL del server - DEVE essere lo stesso di App.js
const SERVER_URL = 'https://geo-logistics-matt-ia.replit.app';

// Cache per l'ID per evitare troppe letture da AsyncStorage
let cachedDeviceId = null;

// Funzione per recuperare l'ID del dispositivo
const getStoredDeviceId = async () => {
  try {
    // Usa cache se disponibile
    if (cachedDeviceId) {
      return cachedDeviceId;
    }
    
    // Recupera da AsyncStorage
    const storedId = await AsyncStorage.getItem('device_rider_id');
    
    if (storedId) {
      cachedDeviceId = storedId; // Salva in cache
      return storedId;
    }
    
    // Se non c'è ID salvato (non dovrebbe succedere), genera uno di emergenza
    console.warn('⚠️ No device ID found in background task, generating emergency ID');
    const emergencyId = `RIDER_BG_${Date.now().toString().slice(-8)}`;
    await AsyncStorage.setItem('device_rider_id', emergencyId);
    cachedDeviceId = emergencyId;
    return emergencyId;
    
  } catch (error) {
    console.error('❌ Error getting device ID in background:', error);
    // Fallback assoluto
    return `RIDER_ERR_${Date.now().toString().slice(-6)}`;
  }
};

// Definizione del background task
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('❌ Background location task error:', error);
    return;
  }
  
  if (data) {
    const { locations } = data;
    
    // Recupera l'ID univoco del dispositivo
    const deviceId = await getStoredDeviceId();
    
    console.log(`📍 Background task processing ${locations.length} locations for ${deviceId}`);
    
    // Processa ogni update di posizione
    for (const location of locations || []) {
      try {
        // Prepara i dati da inviare
        const positionData = {
          driverId: deviceId, // USA L'ID UNIVOCO DEL RIDER!
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
          speed: location.coords.speed || 0,
          altitude: location.coords.altitude,
          heading: location.coords.heading,
          timestamp: new Date(location.timestamp).toISOString(),
          isBackground: true, // Indica che viene dal background
          batteryLevel: null // Potremmo aggiungere il livello batteria in futuro
        };
        
        // Invia al server
        const response = await fetch(`${SERVER_URL}/api/positions`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Device-ID': deviceId, // Header extra per sicurezza
            'X-Background-Task': 'true'
          },
          body: JSON.stringify(positionData)
        });
        
        if (response.ok) {
          console.log('✅ Background position sent successfully:', {
            id: deviceId,
            lat: location.coords.latitude.toFixed(6),
            lng: location.coords.longitude.toFixed(6),
            accuracy: location.coords.accuracy.toFixed(1),
            time: new Date(location.timestamp).toLocaleTimeString()
          });
        } else {
          console.warn(`⚠️ Server responded with status: ${response.status}`);
        }
        
      } catch (error) {
        console.error('❌ Failed to send background location:', error);
        
        // Potremmo salvare le posizioni non inviate per retry futuro
        // await saveFailedPosition(location, deviceId);
      }
    }
    
    // Log riassuntivo
    console.log(`📊 Background batch complete: ${locations.length} locations processed for ${deviceId}`);
  }
});

// Funzione helper per verificare se il task è registrato
export const isBackgroundTaskRegistered = async () => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    console.log(`📱 Background task registered: ${isRegistered}`);
    return isRegistered;
  } catch (error) {
    console.error('Error checking task registration:', error);
    return false;
  }
};

// Funzione per ottenere info sul task (utile per debug)
export const getBackgroundTaskInfo = async () => {
  try {
    const tasks = await TaskManager.getRegisteredTasksAsync();
    const ourTask = tasks.find(task => task.taskName === BACKGROUND_LOCATION_TASK);
    
    if (ourTask) {
      console.log('📋 Background task info:', ourTask);
      return ourTask;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting task info:', error);
    return null;
  }
};

console.log('✅ Background task module loaded successfully');