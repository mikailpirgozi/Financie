# 🚀 EAS Build & Deployment Guide

**App Name:** Financie App  
**Bundle ID (iOS):** com.financieapp.mobile  
**Package Name (Android):** com.financieapp.mobile

---

## 📋 **Prerequisites**

### 1. Install EAS CLI
```bash
npm install -g eas-cli
```

### 2. Login to Expo
```bash
eas login
```

### 3. Configure Project
```bash
cd apps/mobile
eas build:configure
```

---

## ⚙️ **EAS Configuration**

### `eas.json` (already exists, verify/update)

```json
{
  "cli": {
    "version": ">= 5.2.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "distribution": "store",
      "ios": {
        "simulator": false
      },
      "android": {
        "buildType": "aab"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "YOUR_ASC_APP_ID",
        "appleTeamId": "YOUR_TEAM_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./service-account-key.json",
        "track": "internal"
      }
    }
  }
}
```

---

## 📱 **iOS Build Setup**

### 1. App Icon & Splash Screen

Update `app.json`:
```json
{
  "expo": {
    "name": "Financie",
    "slug": "financie-mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.financieapp.mobile",
      "buildNumber": "1",
      "infoPlist": {
        "NSCameraUsageDescription": "This app uses the camera to scan receipts.",
        "NSPhotoLibraryUsageDescription": "This app accesses your photos to upload receipts."
      }
    }
  }
}
```

### 2. Create App in App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Click "+" to create new app
3. Select iOS
4. Name: "Financie"
5. Bundle ID: `com.financieapp.mobile`
6. SKU: `financie-mobile-001`

### 3. Build for TestFlight

```bash
# Development build (for testing)
eas build --profile development --platform ios

# Preview build (for internal distribution)
eas build --profile preview --platform ios

# Production build (for App Store)
eas build --profile production --platform ios
```

### 4. Submit to TestFlight

```bash
eas submit --platform ios --latest
```

---

## 🤖 **Android Build Setup**

### 1. App Icon & Splash Screen

Already configured in `app.json`:
```json
{
  "android": {
    "adaptiveIcon": {
      "foregroundImage": "./assets/adaptive-icon.png",
      "backgroundColor": "#ffffff"
    },
    "package": "com.financieapp.mobile",
    "versionCode": 1,
    "permissions": [
      "CAMERA",
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE"
    ]
  }
}
```

### 2. Create App in Google Play Console

1. Go to https://play.google.com/console
2. Create new app
3. App name: "Financie"
4. Default language: Slovak
5. App or Game: App
6. Free or Paid: Free

### 3. Build APK (Preview)

```bash
# Preview build (APK for testing)
eas build --profile preview --platform android

# Download APK
eas build:download --platform android --profile preview
```

### 4. Build AAB (Production)

```bash
# Production build (AAB for Play Store)
eas build --profile production --platform android
```

### 5. Submit to Play Store

```bash
# Setup service account first
eas submit --platform android --latest
```

---

## 🎨 **Assets Preparation**

### App Icon
**Size:** 1024x1024px  
**Format:** PNG (no transparency)  
**Location:** `apps/mobile/assets/icon.png`

### Splash Screen
**Size:** 1242x2436px (or larger)  
**Format:** PNG  
**Location:** `apps/mobile/assets/splash.png`

### Adaptive Icon (Android)
**Size:** 1024x1024px  
**Format:** PNG  
**Location:** `apps/mobile/assets/adaptive-icon.png`

---

## 🔐 **Environment Variables for Build**

Create `apps/mobile/.env.production`:

```bash
EXPO_PUBLIC_API_URL=https://your-production-api.vercel.app
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Reference in `eas.json`:
```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://your-production-api.vercel.app"
      }
    }
  }
}
```

---

## 📝 **App Store Metadata**

### App Name
**Financie** - Personal Finance Manager

### Subtitle (iOS)
Track expenses, loans & assets

### Description

**Short:**
Spravujte svoje financie jednoducho. Sledujte výdavky, príjmy, úvery a majetok na jednom mieste.

**Full:**
Financie je kompletné riešenie pre správu osobných financií:

✅ Výdavky a príjmy
Zaznamenávajte všetky vaše finančné transakcie s kategóriami a poznámkami.

✅ Úvery
Sledujte splátkové kalendáre, zostatok a najbližšie platby.

✅ Majetok
Evidujte nehnuteľnosti, vozidlá a iný majetok s historickým zhodnotením.

✅ Mesačné súhrny
Prehľadné reporty o vašich financiách.

✅ Domácnosti
Spolupracujte s rodinou na správe rodinného rozpočtu.

### Keywords
financie, rozpočet, výdavky, príjmy, úvery, majetok, Slovak

### Category
- Primary: Finance
- Secondary: Productivity

### Age Rating
4+ (No objectionable content)

---

## 📸 **Screenshots Required**

### iOS
- 6.5" Display (iPhone 14 Pro Max): 1284 x 2778 px
- 5.5" Display (iPhone 8 Plus): 1242 x 2208 px

### Android
- Phone: 1080 x 1920 px minimum
- 7" Tablet: 1200 x 1920 px
- 10" Tablet: 1920 x 1200 px

**Screens to Capture:**
1. Dashboard overview
2. Expenses list
3. Loan detail with schedule
4. Asset valuation
5. Monthly summary

---

## 🔒 **Privacy Policy**

**Required for App Store submission**

Create `privacy-policy.md` with:
- What data you collect
- How you use it
- Third-party services (Supabase)
- User rights
- Contact information

Host at: `https://financieapp.com/privacy`

---

## 📋 **Pre-Submission Checklist**

### iOS
- [ ] App icon (1024x1024)
- [ ] Splash screen
- [ ] Bundle ID configured
- [ ] Build number incremented
- [ ] Privacy policy URL
- [ ] App Store description
- [ ] Keywords
- [ ] Screenshots (all sizes)
- [ ] Age rating set
- [ ] Contact information
- [ ] Support URL

### Android
- [ ] App icon (1024x1024)
- [ ] Adaptive icon
- [ ] Package name configured
- [ ] Version code incremented
- [ ] Privacy policy URL
- [ ] Store listing description
- [ ] Screenshots
- [ ] Content rating
- [ ] Contact information
- [ ] Service account key (for submission)

---

## 🚀 **Build Commands Reference**

### Development Builds
```bash
# iOS Simulator
eas build --profile development --platform ios

# Android Emulator
eas build --profile development --platform android
```

### Preview Builds (Internal Testing)
```bash
# iOS (TestFlight Internal)
eas build --profile preview --platform ios

# Android (APK for sideloading)
eas build --profile preview --platform android
```

### Production Builds
```bash
# iOS (App Store)
eas build --profile production --platform ios

# Android (Play Store)
eas build --profile production --platform android

# Both platforms
eas build --profile production --platform all
```

### Submit to Stores
```bash
# iOS to TestFlight/App Store
eas submit --platform ios --latest

# Android to Play Store
eas submit --platform android --latest
```

---

## 🔄 **Update Process**

### Version Bump

Update `app.json`:
```json
{
  "expo": {
    "version": "1.0.1",  // Semantic version
    "ios": {
      "buildNumber": "2"  // Increment
    },
    "android": {
      "versionCode": 2    // Increment
    }
  }
}
```

### Build & Submit Update
```bash
# Build new version
eas build --profile production --platform all

# Submit
eas submit --platform ios --latest
eas submit --platform android --latest
```

---

## 🐛 **Troubleshooting**

### Build Fails
```bash
# Clear cache
eas build:clear-cache

# Check credentials
eas credentials

# View build logs
eas build:view --id BUILD_ID
```

### Signing Issues (iOS)
```bash
# Reset credentials
eas credentials

# Select iOS
# Choose "Reset all credentials"
```

### Android Signing
```bash
# Generate new keystore
eas credentials

# Select Android
# Choose "Generate new keystore"
```

---

## 📊 **Post-Launch Monitoring**

### iOS
- App Store Connect: Downloads, crashes, reviews
- TestFlight: Beta feedback

### Android
- Play Console: Installs, crashes, ANRs
- Pre-launch reports

### Analytics
- Integrate Expo Analytics (optional)
- Track user flows
- Monitor errors with Sentry (optional)

---

## ✅ **Final Steps**

1. **Test Build Locally**
   ```bash
   npx expo start
   ```

2. **Create Preview Build**
   ```bash
   eas build --profile preview --platform all
   ```

3. **Test on Physical Device**
   - iOS: Install via TestFlight
   - Android: Install APK

4. **Production Build**
   ```bash
   eas build --profile production --platform all
   ```

5. **Submit to Stores**
   ```bash
   eas submit --platform all --latest
   ```

6. **Monitor & Iterate**
   - Check for crashes
   - Read user reviews
   - Plan updates

---

## 📞 **Support**

**EAS Documentation:** https://docs.expo.dev/eas/  
**App Store Connect:** https://appstoreconnect.apple.com  
**Play Console:** https://play.google.com/console

---

**Last Updated:** October 30, 2024  
**Status:** ✅ Ready for Build

