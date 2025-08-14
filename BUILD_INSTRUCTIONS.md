# Build Instructions per BNBKit GPS Native App

## Preparazione Iniziale

### 1. Installa EAS CLI
```bash
npm install -g eas-cli
```

### 2. Login su Expo
```bash
eas login
```

### 3. Genera le icone PNG (se non le hai già)
```bash
npm install sharp --save-dev
node generate-icons.js
```

### 4. Installa le dipendenze
```bash
npm install
```

## Build APK per Android

### Opzione A: APK per Test Interni (Raccomandato per iniziare)
```bash
eas build --platform android --profile preview
```

Questo creerà un APK che puoi:
- Inviare direttamente ai rider via WhatsApp/Email
- Installare manualmente sui dispositivi
- Testare senza Play Store

### Opzione B: Build di Produzione (AAB per Play Store)
```bash
eas build --platform android --profile production
```

## Installazione sui Dispositivi dei Rider

### Per APK diretto:
1. Invia l'APK ai rider
2. I rider devono:
   - Abilitare "Origini sconosciute" nelle impostazioni Android
   - Aprire il file APK
   - Installare l'app
   - Concedere TUTTI i permessi richiesti (importante: scegliere "Sempre" per la posizione)

### Permessi Critici:
L'app richiederà:
- **Posizione**: Scegliere "Consenti sempre" per il tracking in background
- **Notifiche**: Per mostrare lo stato del tracking

## Test del Sistema Completo

1. **Avvia l'app** sul telefono del rider
2. **Premi "AVVIA GPS NATIVO"**
3. **Concedi tutti i permessi** (importante: "Sempre" per posizione)
4. **Verifica sulla web app** cercando "NATIVE_APP" sulla mappa
5. **Test background**: Chiudi completamente l'app e verifica che continui a tracciare

## Troubleshooting

### Se il GPS non funziona in background:
1. Verifica che il permesso posizione sia impostato su "Sempre"
2. Controlla che l'ottimizzazione batteria non stia bloccando l'app
3. Su alcuni dispositivi (es. Xiaomi, Huawei) serve disabilitare il risparmio energetico per l'app

### Se non riesci a installare l'APK:
1. Abilita "Origini sconosciute" o "Installa app sconosciute"
2. Usa un file manager per aprire l'APK
3. Verifica che il dispositivo sia Android 6.0+

## Configurazione per Produzione

Prima del rilascio finale:
1. Cambia `driverId` da 'NATIVE_APP' a un ID univoco per rider
2. Implementa autenticazione/login
3. Aggiungi gestione errori robusta
4. Configura analytics e crash reporting

## Link Utili
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Background Location Guide](https://docs.expo.dev/versions/latest/sdk/location/#background-location-methods)