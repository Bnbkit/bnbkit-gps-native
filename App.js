import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Platform
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKGROUND_LOCATION_TASK } from './backgroundTask';

const SERVER_URL = 'https://geo-logistics-matt-ia.replit.app';

export default function App() {
  const [location, setLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [status, setStatus] = useState('🚀 Pronto per GPS nativo!');
  const [deviceId, setDeviceId] = useState(null);

  // Inizializza device ID e controlla stato background all'avvio
  useEffect(() => {
    const initializeApp = async () => {
      // Recupera o genera ID dispositivo
      const id = await getOrCreateDeviceId();
      setDeviceId(id);
      
      // Controlla se il background task è già attivo
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      if (isRegistered) {
        setIsTracking(true);
        setStatus(`📍 GPS già attivo! ID: ${id}`);
      } else {
        setStatus(`🆔 ID dispositivo: ${id}`);
      }
    };
    
    initializeApp();
  }, []);

  // Genera o recupera un ID unico per questo dispositivo
  const getOrCreateDeviceId = async () => {
    try {
      let storedId = await AsyncStorage.getItem('device_rider_id');
      if (!storedId) {
        // Genera nuovo ID univoco: RIDER_ + timestamp + random
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 999).toString().padStart(3, '0');
        storedId = `RIDER_${timestamp}${random}`;
        await AsyncStorage.setItem('device_rider_id', storedId);
        console.log('🆔 Nuovo ID generato:', storedId);
      } else {
        console.log('🆔 ID esistente recuperato:', storedId);
      }
      return storedId;
    } catch (error) {
      console.error('Error getting device ID:', error);
      // Fallback ID se AsyncStorage fallisce
      return `RIDER_${Date.now().toString().slice(-8)}`;
    }
  };

  const sendPosition = async (coords) => {
    try {
      // Assicurati di avere un device ID
      const currentDeviceId = deviceId || await getOrCreateDeviceId();
      if (!deviceId) setDeviceId(currentDeviceId);

      const response = await fetch(`${SERVER_URL}/api/positions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: currentDeviceId,
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          speed: coords.speed || 0,
          timestamp: new Date().toISOString(),
          platform: Platform.OS // 'android' o 'ios'
        })
      });

      if (response.ok) {
        console.log('📤 Position sent successfully for:', currentDeviceId);
        return true;
      }
      console.log('❌ Server response not OK:', response.status);
      return false;
    } catch (error) {
      console.error('Send position error:', error);
      return false;
    }
  };

  const getLocationOnce = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 5000,
        distanceInterval: 5
      });
      return loc;
    } catch (error) {
      console.error('GPS Error:', error);
      return null;
    }
  };

  const startNativeTracking = async () => {
    try {
      setStatus('🔄 Richiesta permessi nativi...');
      
      // Request foreground permission
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        Alert.alert(
          'Permessi GPS Negati',
          'I permessi GPS sono necessari per il tracking. Vai nelle impostazioni e abilita la posizione per BNBKit.',
          [{ text: 'OK' }]
        );
        setStatus('❌ Permessi GPS negati');
        return;
      }

      // Request background permission - CRITICAL for native app
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        Alert.alert(
          '⚠️ Permesso Background NECESSARIO',
          'Per il GPS in background:\n\n1. Vai in Impostazioni\n2. Privacy → Servizi di localizzazione\n3. BNBKit → "Sempre"\n\nSenza questo, il GPS si fermerà quando chiudi l\'app!',
          [{ text: 'Ho capito' }]
        );
      }

      // Get and send initial position
      setStatus('📡 Acquisizione posizione...');
      const initialLoc = await getLocationOnce();
      if (initialLoc) {
        setLocation(initialLoc);
        await sendPosition(initialLoc.coords);
        setStatus(`✅ GPS collegato! ID: ${deviceId}`);
      }

      // Start REAL background tracking with TaskManager
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 15000, // 15 secondi
        distanceInterval: 10, // 10 metri
        foregroundService: {
          notificationTitle: 'BNBKit GPS Tracker',
          notificationBody: `Tracking attivo - ID: ${deviceId}`,
          notificationColor: '#e83c7b'
        },
        deferredUpdatesInterval: 0,
        deferredUpdatesDistance: 0,
        showsBackgroundLocationIndicator: true,
        pausesUpdatesAutomatically: false,
      });

      setIsTracking(true);
      console.log('🚀 Background tracking started for:', deviceId);
      
      Alert.alert(
        '🎉 GPS NATIVO ATTIVATO!',
        `✅ GPS background attivo\n✅ Notifica persistente visibile\n✅ Funziona con app chiusa\n\n🆔 TUO ID UNICO:\n${deviceId}\n\nTEST:\n1. Chiudi completamente l'app\n2. Muoviti per 100 metri\n3. Verifica sulla mappa web che ${deviceId} si muova!`,
        [{ text: 'Perfetto!' }]
      );

      // Setup UI updates (solo per mostrare posizione nell'app)
      const uiUpdateInterval = setInterval(async () => {
        if (!isTracking) {
          clearInterval(uiUpdateInterval);
          return;
        }
        
        const loc = await getLocationOnce();
        if (loc) {
          setLocation(loc);
          console.log('📍 UI Update:', {
            id: deviceId,
            lat: loc.coords.latitude.toFixed(6),
            lng: loc.coords.longitude.toFixed(6)
          });
        }
      }, 15000);

      // Salva interval ID per pulizia
      await AsyncStorage.setItem('uiIntervalId', uiUpdateInterval.toString());

    } catch (error) {
      console.error('Start tracking error:', error);
      Alert.alert('Errore GPS', `Impossibile avviare il tracking:\n${error.message}`);
      setStatus('❌ Errore avvio GPS');
      setIsTracking(false);
    }
  };

  const stopTracking = async () => {
    try {
      // Ferma background location updates
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        console.log('✅ Background tracking stopped');
      }
      
      // Pulisci UI interval
      const intervalId = await AsyncStorage.getItem('uiIntervalId');
      if (intervalId) {
        clearInterval(parseInt(intervalId));
        await AsyncStorage.removeItem('uiIntervalId');
      }
      
      setIsTracking(false);
      setStatus(`🛑 GPS fermato. ID: ${deviceId}`);
      
      Alert.alert(
        'GPS Fermato',
        'Il tracking GPS è stato interrotto.\nLa notifica dovrebbe sparire.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Stop tracking error:', error);
      setIsTracking(false);
      setStatus('🛑 GPS fermato');
    }
  };

  const testConnection = async () => {
    setStatus('🔄 Test connessione server...');
    try {
      const response = await fetch(`${SERVER_URL}/api/status`);
      if (response.ok) {
        const data = await response.text();
        setStatus('✅ Server BNBKit online!');
        Alert.alert('Test Server', `Connessione OK!\n\nRisposta: ${data}`);
      } else {
        setStatus('⚠️ Server non risponde correttamente');
      }
    } catch (error) {
      setStatus('❌ Errore connessione server');
      Alert.alert('Errore', `Impossibile connettersi al server:\n${error.message}`);
    }
  };

  const checkBackgroundStatus = async () => {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    const hasBackgroundPermission = await Location.getBackgroundPermissionsAsync();
    
    Alert.alert(
      '🔍 Status Background GPS',
      `Task registrato: ${isRegistered ? 'SÌ ✅' : 'NO ❌'}\n` +
      `Tracking attivo: ${isTracking ? 'SÌ ✅' : 'NO ❌'}\n` +
      `Permesso background: ${hasBackgroundPermission.status === 'granted' ? 'SÌ ✅' : 'NO ❌'}\n` +
      `ID dispositivo: ${deviceId || 'Non generato'}\n` +
      `Platform: ${Platform.OS}`,
      [{ text: 'OK' }]
    );
  };

  const resetDeviceId = async () => {
    Alert.alert(
      '⚠️ Reset ID Dispositivo',
      'Questo genererà un nuovo ID. Il vecchio ID non sarà più tracciato. Continuare?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('device_rider_id');
            const newId = await getOrCreateDeviceId();
            setDeviceId(newId);
            setStatus(`🆕 Nuovo ID: ${newId}`);
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="light" backgroundColor="#e83c7b" />
      
      <View style={styles.header}>
        <Text style={styles.title}>🚚 BNBKit GPS Tracker</Text>
        <Text style={styles.subtitle}>Sistema Tracking Rider Nativo</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        
        {/* Status Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Status Sistema</Text>
          <Text style={styles.statusText}>{status}</Text>
          
          <View style={styles.statusRow}>
            <Text style={styles.label}>Tipo App:</Text>
            <Text style={[styles.badge, {color: '#22c55e'}]}>
              ✅ NATIVA {Platform.OS.toUpperCase()}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.label}>GPS Background:</Text>
            <Text style={[styles.badge, {color: isTracking ? '#22c55e' : '#64748b'}]}>
              {isTracking ? '🟢 ATTIVO' : '⚫ INATTIVO'}
            </Text>
          </View>
          
          <View style={styles.statusRow}>
            <Text style={styles.label}>ID Rider:</Text>
            <TouchableOpacity onPress={resetDeviceId} style={styles.idContainer}>
              <Text style={[styles.badge, {color: '#3b82f6', fontSize: 12}]}>
                {deviceId || 'Generando...'} 🔄
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Location Card */}
        {location && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📍 Posizione Live</Text>
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
            <Text style={styles.coordText}>
              Altitudine: {location.coords.altitude?.toFixed(1) || 'N/A'}m
            </Text>
          </View>
        )}

        {/* Main Control Button */}
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
            {isTracking ? '🛑 FERMA TRACKING' : '🚀 AVVIA TRACKING GPS'}
          </Text>
        </TouchableOpacity>

        {/* Action Buttons */}
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
                await sendPosition(loc.coords);
                setStatus('📍 Posizione aggiornata e inviata!');
              } else {
                setStatus('❌ GPS non disponibile');
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryText}>📍 Update GPS</Text>
          </TouchableOpacity>
        </View>

        {/* Debug Button */}
        <TouchableOpacity
          style={[styles.secondaryButton, {backgroundColor: '#10b981', marginBottom: 16}]}
          onPress={checkBackgroundStatus}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryText}>🔍 Verifica Status Background</Text>
        </TouchableOpacity>

        {/* Instructions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Come Testare</Text>
          <Text style={styles.instructionText}>
            <Text style={styles.bold}>1. AVVIA IL TRACKING</Text>{'\n'}
            Premi il pulsante rosa e concedi tutti i permessi{'\n\n'}
            
            <Text style={styles.bold}>2. VERIFICA LA NOTIFICA</Text>{'\n'}
            Deve apparire "BNBKit GPS Tracker" nella barra{'\n\n'}
            
            <Text style={styles.bold}>3. TEST BACKGROUND</Text>{'\n'}
            • Chiudi COMPLETAMENTE l'app{'\n'}
            • La notifica deve rimanere visibile{'\n'}
            • Muoviti per 100+ metri{'\n\n'}
            
            <Text style={styles.bold}>4. VERIFICA SULLA MAPPA</Text>{'\n'}
            • Apri la web app BNBKit{'\n'}
            • Cerca il tuo ID: {deviceId || 'Non ancora generato'}{'\n'}
            • Il punto deve muoversi in tempo reale!
          </Text>
        </View>

        {/* Active Tracking Info */}
        {isTracking && (
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>🎯 TRACKING ATTIVO!</Text>
            <Text style={styles.successText}>
              Il GPS sta inviando la tua posizione al server.{'\n\n'}
              
              <Text style={styles.bold}>NOTIFICA VISIBILE?</Text>{'\n'}
              ✅ SÌ = GPS background funziona{'\n'}
              ❌ NO = Controlla permessi "Sempre"{'\n\n'}
              
              <Text style={styles.bold}>TEST FINALE:</Text>{'\n'}
              Chiudi l'app e verifica che continui a tracciare!
            </Text>
          </View>
        )}

        {/* Technical Info */}
        <View style={styles.techCard}>
          <Text style={styles.cardTitle}>🔧 Info Tecniche</Text>
          <Text style={styles.techText}>
            Server: {SERVER_URL.replace('https://', '').substring(0, 30)}...{'\n'}
            Task: {BACKGROUND_LOCATION_TASK}{'\n'}
            Update: ogni 15s o 10m di movimento{'\n'}
            Platform: {Platform.OS} {Platform.Version}
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
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 4,
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
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1e293b',
  },
  statusText: {
    fontSize: 16,
    color: '#475569',
    marginBottom: 16,
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 4,
  },
  label: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '500',
  },
  badge: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  idContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coordText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#64748b',
    marginBottom: 6,
    backgroundColor: '#f1f5f9',
    padding: 4,
    borderRadius: 4,
  },
  mainButton: {
    padding: 20,
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
    fontSize: 18,
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
    fontSize: 14,
    fontWeight: '600',
  },
  instructionText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  bold: {
    fontWeight: 'bold',
    color: '#1e293b',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#065f46',
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: '#065f46',
    lineHeight: 20,
  },
  techCard: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 12,
    borderColor: '#3b82f6',
    borderWidth: 1,
  },
  techText: {
    fontSize: 12,
    color: '#1e40af',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 18,
  },
});