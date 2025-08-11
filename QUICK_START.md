# 🚀 Quick Start - BNBKit GPS Native App

## Comandi Rapidi per Iniziare

### 1. Setup Iniziale (esegui una volta)
```bash
# Installa EAS CLI globalmente
npm install -g eas-cli

# Login su Expo
eas login

# Installa dipendenze del progetto
npm install

# Configura il progetto per EAS Build
eas build:configure
```

### 2. Build APK per Test
```bash
# Build APK per test immediato sui rider
eas build --platform android --profile preview
```

Questo comando:
- Creerà un APK in circa 10-15 minuti
- Ti darà un link per scaricare l'APK
- L'APK può essere installato direttamente sui telefoni

### 3. Dopo il Build

1. **Scarica l'APK** dal link fornito da EAS
2. **Invia l'APK ai rider** via WhatsApp/Email
3. **I rider devono**:
   - Abilitare "Installa app sconosciute" 
   - Installare l'APK
   - Dare permesso "Sempre" alla posizione
   - Avviare il tracking GPS

### 4. Verifica Funzionamento

- Apri la web app BNBKit
- Cerca "NATIVE_APP" sulla mappa
- Il punto dovrebbe muoversi anche con app chiusa

## ⚠️ Punti Critici

1. **Permessi**: L'app DEVE avere permesso "Sempre" per la posizione
2. **Batteria**: Disabilita ottimizzazione batteria per l'app
3. **Background**: Su alcuni telefoni serve configurazione extra nelle impostazioni

## 📱 Requisiti Minimi

- Android 6.0 (API 23) o superiore
- GPS attivo sul dispositivo
- Connessione internet per inviare posizioni

## 🔧 Personalizzazioni Future

Nel file `App.js`:
- Cambia `driverId: 'NATIVE_APP'` con ID univoci per rider
- Modifica `SERVER_URL` se cambia il backend
- Aggiungi login/autenticazione

## 🆘 Problemi Comuni

**"Non si installa l'APK"**
→ Abilita origini sconosciute nelle impostazioni

**"GPS non funziona in background"**
→ Controlla permesso "Sempre" e disabilita risparmio batteria

**"Non vedo il rider sulla mappa"**
→ Verifica connessione internet e che il server sia attivo

---

Per supporto: [inserisci contatto supporto]