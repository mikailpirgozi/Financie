# Mobile App Environment Setup

## Environment Variables

Create a `.env` file in `apps/mobile/` with the following variables:

```bash
# API Configuration
# For local development, use your machine's IP address or localhost
# For production, use your Vercel deployment URL
EXPO_PUBLIC_API_URL=http://localhost:3000

# Supabase Configuration
# Get these from your Supabase project settings
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Development Notes

**Local Development:**
- iOS Simulator: Use `http://localhost:3000`
- Android Emulator: Use `http://10.0.2.2:3000`
- Physical Device: Use your machine's local IP (e.g., `http://192.168.1.100:3000`)

**Production:**
- Set `EXPO_PUBLIC_API_URL` to your Vercel deployment URL (e.g., `https://your-app.vercel.app`)

### Finding Your Local IP

**macOS/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Windows:**
```cmd
ipconfig
```

Look for your WiFi adapter's IPv4 address.

## Installation

After setting up your `.env` file, install dependencies:

```bash
cd apps/mobile
pnpm install
```

## Running the App

```bash
# Start Expo development server
pnpm dev

# Or run directly on platform
pnpm ios      # iOS Simulator
pnpm android  # Android Emulator
```

Scan the QR code with Expo Go app on your physical device, or press `i` for iOS simulator or `a` for Android emulator.

## TypeScript Configuration

The project is configured with strict TypeScript mode:
- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noImplicitReturns: true`
- `noFallthroughCasesInSwitch: true`

Run type checking:
```bash
pnpm typecheck
```

## Path Aliases

The following path aliases are configured:
- `@/*` → `./src/*`
- `@/components` → `./src/components`
- `@/lib` → `./src/lib`
- `@/hooks` → `./src/hooks`

Example usage:
```typescript
import { Button } from '@/components/ui/Button';
import { env } from '@/lib/env';
import { useExpenses } from '@/hooks/useExpenses';
```

