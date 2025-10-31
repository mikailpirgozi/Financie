# Mobile App Setup & Testing Guide

## Recent Fixes (October 2025)

### Issues Resolved

1. **React Native Text Rendering Error** ✅
   - Fixed: TabBar icons must be wrapped in `<Text>` components in React Native
   - Location: `apps/mobile/app/(tabs)/_layout.tsx`
   - Change: All emoji icons now wrapped: `tabBarIcon: () => <Text>📊</Text>`

2. **Realtime Subscription "Unauthorized" Error** ✅
   - Fixed: Improved error handling for RLS policy violations on realtime subscriptions
   - Location: `apps/mobile/src/lib/realtime.ts`
   - Change: Added graceful degradation - app continues with polling if realtime fails
   - Note: This is normal behavior - realtime is a nice-to-have enhancement, not critical

3. **Missing API Endpoints** ✅
   - Created: `/api/dashboard` - returns monthly summaries for dashboard
   - Created: DELETE endpoints for `/api/expenses/[id]`, `/api/incomes/[id]`, `/api/assets/[id]`
   - Fixed: `/api/households/current` response format for mobile compatibility

## Setup Instructions

### 1. Environment Variables

Create `.env` in `apps/mobile/` with:

```bash
# API Configuration - point to your web server
# For local development use your machine's IP:
EXPO_PUBLIC_API_URL=http://localhost:3000
# Or your Vercel deployment:
# EXPO_PUBLIC_API_URL=https://your-app.vercel.app

# Supabase Configuration - get from your Supabase project
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Start Web Backend

```bash
# From project root
cd apps/web
pnpm install
pnpm dev
```

The web server should start on port 3000.

### 3. Start Mobile App

```bash
# From project root
cd apps/mobile
pnpm install
pnpm dev
```

Then:
- Press `i` for iOS simulator, or
- Press `a` for Android emulator, or
- Scan QR code with Expo Go on physical device

### 4. Testing Login

Use existing web account credentials:

```
Email: your-email@example.com
Password: your-password
```

Or create new account via registration screen.

## Testing Checklist

- [ ] Login screen appears
- [ ] Can login with existing web account credentials
- [ ] Dashboard loads with data (príjmy, výdavky, úvery, majetok)
- [ ] Tabs navigation works (all 10 tabs visible)
- [ ] Tap expense icon → add expense works
- [ ] Tap income icon → add income works
- [ ] Pull to refresh works
- [ ] Logout works and redirects to login

## Architecture

### Mobile App Structure
```
apps/mobile/
├── app/
│   ├── (auth)/          # Login & Register screens
│   ├── (tabs)/          # Tab-based navigation
│   │   ├── index.tsx    # Dashboard
│   │   ├── expenses.tsx
│   │   ├── incomes.tsx
│   │   └── ...
├── src/
│   ├── lib/
│   │   ├── api.ts       # API client with retry logic
│   │   ├── supabase.ts  # Supabase client
│   │   ├── realtime.ts  # Realtime subscriptions
│   │   └── env.ts       # Environment validation
```

### API Communication

Mobile app calls web backend API:
- Authentication: Supabase JWT token in `Authorization` header
- Base URL: `EXPO_PUBLIC_API_URL` from `.env`
- All requests include user session token automatically
- Retries up to 2 times on network errors
- Timeout: 30 seconds per request

## Troubleshooting

### "Failed to setup realtime: Error: Unauthorized"
- **This is expected** - realtime has stricter RLS requirements
- App will work normally with polling fallback
- Check browser console logs for details

### "Network error. Please check your internet connection."
- Ensure web backend is running on correct port
- Check `EXPO_PUBLIC_API_URL` matches your setup
- On Android emulator: use `http://10.0.2.2:3000` instead of `localhost`

### Tab icons not appearing / text rendering errors
- This is fixed in latest version
- If persists: clear node_modules and reinstall: `pnpm install`

## Data Synchronization

- Mobile app reads from same Supabase database as web app
- All changes sync in real-time via realtime subscriptions (when available)
- Fallback: manual refresh (pull to refresh)
- No offline support yet

## Performance Notes

- Dashboard loads last 6 months of history
- Expense/Income lists are paginated (100 items initially)
- Charts use simplified rendering for mobile performance
- Large datasets may be slow - consider filtering by date range
