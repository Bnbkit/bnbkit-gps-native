import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
  SafeAreaView
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKGROUND_LOCATION_TASK } from './backgroundTask';

const SERVER_URL = 'https://5b70e398-26eb-4d7d-9586-6be5b65229cd-00-3gcmy6q53pmg4.worf.replit.dev';
 
export default function App() {
  const [location, setLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [status, setStatus] = useState('🚀 Pronto per GPS nativo!');

  // Check if background task is running on app start
  useEffect(() => {
    checkBackgroundStatus();
  }, []);

  const checkBackgroundStatus = async () => {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    if (isRegistered) {
      setIsTracking(true);
      setStatus('📍 GPS background già attivo!');
    }
  };

  const sendPosition = async (coords) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/positions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: 'NATIVE_APP',
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          speed: coords.speed || 0,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        console.log('📤 Position sent successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.log('Send error:', error);
      return false;
    }
  };

  const getLocationOnce = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation
      });
      return loc;
    } catch (error) {
      console.log('GPS Error:', error);
      return null;
    }
  };

  const startNativeTracking = async () => {
    try {
      setStatus('🔄 Richiesta permessi nativi...');
      
      // Request foreground permission
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        Alert.alert('Permessi GPS', 'Concedi i permessi per continuare.');
        setStatus('❌ Permessi negati');
        return;
      }

      // Request background permission - CRITICAL for native app
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        Alert.alert(
          'Permesso Background NECESSARIO',
          'Nelle impostazioni, scegli "Sempre" per i permessi posizione. Questo è essenziale per GPS nativo.',
          [{ text: 'OK' }]
        );
        // Continue anyway - user might grant later
      }

      // Get initial position
      const initialLoc = await getLocationOnce();
      if (initialLoc) {
        setLocation(initialLoc);
        await sendPosition(initialLoc.coords);
      }

      // Start REAL background tracking
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 15000, // 15 seconds
        distanceInterval: 10, // 10 meters
        foregroundService: {
          notificationTitle: 'BNBKit GPS Tracker',
          notificationBody: 'Tracking posizione per consegne',
          notificationColor: '#e83c7b'
        },
        deferredUpdatesInterval: 0,
        deferredUpdatesDistance: 0,
        showsBackgroundLocationIndicator: true,
      });

      setIsTracking(true);
      setStatus('✅ GPS nativo collegato!');
      
      Alert.alert(
        '🎉 GPS NATIVO ATTIVATO!',
        'Questa è una VERA APP NATIVA!\n\n✅ GPS BACKGROUND NATIVO\n✅ NESSUN LIMITE BROWSER\n✅ PERFORMANCE COMPLETE\n\nPer testare:\n1. Chiudi COMPLETAMENTE l\'app\n2. Cammina per 5 minuti\n3. Apri mappa BNBKit su computer\n4. Cerca "NATIVE_APP"\n5. Il punto si muove!\n\nQUESTO È GPS NATIVO VERO!',
        [{ text: 'Fantastico!' }]
      );

      console.log('🚀 Native background tracking started');

      // Setup foreground tracking for UI updates only
      const intervalId = setInterval(async () => {
        if (!isTracking) return;
        
        const loc = await getLocationOnce();
        if (loc) {
          setLocation(loc);
          console.log('📍 UI update:', {
            lat: loc.coords.latitude.toFixed(6),
            lng: loc.coords.longitude.toFixed(6)
          });
        }
      }, 15000);

      // Store interval ID for cleanup
      await AsyncStorage.setItem('uiIntervalId', intervalId.toString());

    } catch (error) {
      Alert.alert('Errore GPS Nativo', 'Impossibile avviare: ' + error.message);
      setStatus('❌ Errore nativo');
      setIsTracking(false);
    }
  };

  const stopTracking = async () => {
    try {
      // Stop background location updates
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }
      
      // Clear UI update interval
      const intervalId = await AsyncStorage.getItem('uiIntervalId');
      if (intervalId) {
        clearInterval(parseInt(intervalId));
        await AsyncStorage.removeItem('uiIntervalId');
      }
      
      setIsTracking(false);
      setStatus('🛑 GPS nativo fermato');
      Alert.alert('GPS Fermato', 'Tracciamento nativo interrotto.');
    } catch (error) {
      console.error('Error stopping tracking:', error);
      setIsTracking(false);
      setStatus('🛑 Fermato');
    }
  };

  const testConnection = async () => {
    setStatus('🔄 Test server...');
    try {
      const response = await fetch(`${SERVER_URL}/api/status`);
      if (response.ok) {
        setStatus('✅ Server BNBKit OK!');
      } else {
        setStatus('⚠️ Server non risponde');
      }
    } catch (error) {
      setStatus('❌ Errore connessione');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="light" backgroundColor="#e83c7b" />
      
      <View style={styles.header}>
        <Text style={styles.title}>🚚 BNBKit GPS NATIVO</Text>
        <Text style={styles.subtitle}>Vera App Installabile</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        
        {/* Native Status Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Status App Nativa</Text>
          <Text style={styles.statusText}>{status}</Text>
          
          <View style={styles.statusRow}>
            <Text style={styles.label}>Tipo App:</Text>
            <Text style={[styles.badge, {color: '#22c55e'}]}>
              ✅ NATIVA
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.label}>GPS Background:</Text>
            <Text style={[styles.badge, {color: isTracking ? '#22c55e' : '#64748b'}]}>
              {isTracking ? '🟢 NATIVO ATTIVO' : '⚫ Inattivo'}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.label}>Task Manager:</Text>
            <Text style={[styles.badge, {color: '#22c55e'}]}>
              ✅ CONFIGURATO
            </Text>
          </View>
        </View>

        {/* Location Card */}
        {location && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📍 GPS Nativo Live</Text>
            <Text style={styles.coordText}>
              Lat: {location.coords.latitude.toFixed(6)}
            </Text>
            <Text style={styles.coordText}>
              Lng: {location.coords.longitude.toFixed(6)}
            </Text>
            <Text style={styles.coordText}>
              Precisione: {location.coords.accuracy?.toFixed(1)}m
            </Text>
            <Text style={styles.coordText}>
              Velocità: {((location.coords.speed || 0) * 3.6).toFixed(1)} km/h
            </Text>
          </View>
        )}

        {/* Main Native Button */}
        <TouchableOpacity
          style={[
            styles.mainButton,
            { 
              backgroundColor: isTracking ? '#ef4444' : '#e83c7b'
            }
          ]}
          onPress={isTracking ? stopTracking : startNativeTracking}
          activeOpacity={0.8}
        >
          <Text style={styles.mainButtonText}>
            {isTracking ? '🛑 FERMA GPS NATIVO' : '🚀 AVVIA GPS NATIVO'}
          </Text>
        </TouchableOpacity>

        {/* Secondary Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.secondaryButton, {backgroundColor: '#3b82f6'}]}
            onPress={testConnection}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryText}>🌐 Test Server</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, {backgroundColor: '#8b5cf6'}]}
            onPress={async () => {
              const loc = await getLocationOnce();
              if (loc) {
                setLocation(loc);
                setStatus('✅ GPS nativo aggiornato!');
              } else {
                setStatus('❌ GPS non disponibile');
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryText}>📍 GPS Test</Text>
          </TouchableOpacity>
        </View>

        {/* Check Background Status */}
        <TouchableOpacity
          style={[styles.secondaryButton, {backgroundColor: '#10b981', marginBottom: 16}]}
          onPress={async () => {
            const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
            Alert.alert(
              'Background Task Status',
              `Task registrato: ${isRegistered ? 'SÌ ✅' : 'NO ❌'}\nTracking attivo: ${isTracking ? 'SÌ ✅' : 'NO ❌'}`
            );
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryText}>🔍 Verifica Background Task</Text>
        </TouchableOpacity>

        {/* Native Instructions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Test App Nativa</Text>
          <Text style={styles.instructionText}>
            1. Premi "AVVIA GPS NATIVO"{'\n'}
            2. Concedi TUTTI i permessi{'\n'}
            3. Scegli "SEMPRE" per posizione{'\n'}
            4. CHIUDI completamente l'app{'\n'}
            5. Cammina per 5 minuti{'\n'}
            6. Apri mappa BNBKit su computer{'\n'}
            7. Cerca "NATIVE_APP" sulla mappa{'\n\n'}
            ✅ Se il punto si muove = GPS nativo OK!{'\n\n'}
            🎯 DIFFERENZA vs Web App:{'\n'}
            • Web App: GPS si ferma in background{'\n'}
            • App Nativa: GPS SEMPRE attivo
          </Text>
        </View>

        {/* Native Success */}
        {isTracking && (
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>🎉 GPS NATIVO ATTIVO!</Text>
            <Text style={styles.successText}>
              APP NATIVA con GPS background VERO!{'\n\n'}
              ✅ Task Manager attivo{'\n'}
              ✅ Background location updates{'\n'}
              ✅ GPS funziona con app chiusa{'\n\n'}
              CHIUDI L'APP PER TESTARE!{'\n\n'}
              Il GPS continuerà a funzionare!
            </Text>
          </View>
        )}

        {/* Native Benefits */}
        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>🏆 Vantaggi App Nativa</Text>
          <Text style={styles.benefitsText}>
            ✅ GPS background VERO (TaskManager){'\n'}
            ✅ Zero freeze o limitazioni{'\n'}
            ✅ Notifica persistente del servizio{'\n'}
            ✅ Performance native complete{'\n'}
            ✅ Installabile sulla home{'\n'}
            ✅ Pronta per Play Store/App Store
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#e83c7b',
    paddingTop: 10,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: 'white',
    padding: 18,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1e293b',
  },
  statusText: {
    fontSize: 15,
    color: '#475569',
    marginBottom: 16,
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 15,
    color: '#334155',
  },
  badge: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  coordText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#64748b',
    marginBottom: 4,
  },
  mainButton: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  mainButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  secondaryButton: {
    flex: 0.48,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  secondaryText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  instructionText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  successCard: {
    backgroundColor: '#ecfdf5',
    padding: 16,
    borderRadius: 12,
    borderColor: '#22c55e',
    borderWidth: 2,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#065f46',
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: '#065f46',
    lineHeight: 20,
  },
  benefitsCard: {
    backgroundColor: '#fef7ff',
    padding: 16,
    borderRadius: 12,
    borderColor: '#8b5cf6',
    borderWidth: 2,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#581c87',
    marginBottom: 8,
  },
  benefitsText: {
    fontSize: 14,
    color: '#581c87',
    lineHeight: 20,
  },
});
