# 📋 Mobile App Testing Checklist

**Last Updated:** October 30, 2024  
**App Version:** 1.0.0  
**Tester:** _____________  
**Device:** _____________  
**OS Version:** _____________

---

## ✅ **Pre-Testing Setup**

- [ ] `.env` file configured with valid credentials
- [ ] `pnpm install` completed successfully
- [ ] App builds without errors (`npx expo start`)
- [ ] Connected to development API or production API
- [ ] Test user account created

---

## 🔐 **Authentication**

### Login
- [ ] Can log in with valid credentials
- [ ] Shows error for invalid credentials
- [ ] Password visibility toggle works
- [ ] "Forgot password" link navigates correctly

### Registration
- [ ] Can create new account
- [ ] Email validation works
- [ ] Password strength indicator works
- [ ] Shows error for duplicate email

### Session
- [ ] App remembers logged-in state on restart
- [ ] Logout works correctly
- [ ] Session expires appropriately

---

## 💸 **Expenses**

### List Screen
- [ ] Expenses load correctly
- [ ] Grouped by date properly
- [ ] Shows total amount
- [ ] Search functionality works
- [ ] Pull-to-refresh works
- [ ] Empty state displays when no expenses
- [ ] Swipe left reveals edit/delete actions
- [ ] Tap expense navigates to detail

### Create Screen
- [ ] Can create new expense
- [ ] Date picker works (iOS/Android native)
- [ ] Amount input accepts numbers only
- [ ] Currency formatting displays correctly (EUR)
- [ ] Category picker opens
- [ ] Merchant field saves correctly
- [ ] Note field saves correctly
- [ ] Form validation shows errors
- [ ] Success toast appears on save
- [ ] Navigates back after save

### Detail Screen
- [ ] Shows all expense details
- [ ] Amount formatted correctly
- [ ] Date formatted correctly
- [ ] Category displayed
- [ ] Edit button navigates to edit screen
- [ ] Delete button shows confirmation
- [ ] Delete removes expense

### Edit Screen
- [ ] Form pre-filled with existing data
- [ ] Can update all fields
- [ ] Validation works
- [ ] Save updates expense
- [ ] Cancel button works

---

## 💰 **Incomes**

### List Screen
- [ ] Incomes load correctly
- [ ] Grouped by month properly
- [ ] Shows total income
- [ ] Search functionality works
- [ ] Pull-to-refresh works
- [ ] Empty state displays
- [ ] Swipe actions work
- [ ] Tap navigates to detail

### Create Screen
- [ ] Can create new income
- [ ] Date picker works
- [ ] Amount input works
- [ ] Source field required
- [ ] Category picker works
- [ ] Note optional
- [ ] Validation works
- [ ] Success toast appears

### Detail & Edit
- [ ] Detail shows all info
- [ ] Edit pre-fills form
- [ ] Can update income
- [ ] Delete works with confirmation

---

## 🏦 **Loans**

### List Screen
- [ ] Loans load in grid (2 columns)
- [ ] Progress bars display correctly
- [ ] Status badges show (Active/Paid Off)
- [ ] Remaining balance accurate
- [ ] Next payment date shows for active loans
- [ ] Filter by status works (All/Active/Paid Off)
- [ ] Shows total remaining balance
- [ ] Empty state displays
- [ ] Tap navigates to detail

### Create Screen
- [ ] Lender field works
- [ ] Loan type picker works (Annuity, Fixed Principal, etc.)
- [ ] Principal amount input works
- [ ] Interest rate input works (decimal)
- [ ] Rate type picker works (Fixed/Variable)
- [ ] Start date picker works
- [ ] Term (months) input works
- [ ] Fee fields optional
- [ ] Form validation prevents invalid data
- [ ] Success toast appears
- [ ] Creates loan with schedule

### Detail Screen
- [ ] Loan overview displays correctly
- [ ] Progress bar shows paid vs remaining
- [ ] Payment schedule displays
- [ ] Installments show: due date, amount, status
- [ ] Paid installments marked correctly
- [ ] "Show all" toggles full schedule
- [ ] "Pay installment" button navigates
- [ ] Edit button works
- [ ] Delete shows confirmation

### Pay Screen
- [ ] Pre-fills next installment amount
- [ ] Date picker defaults to today
- [ ] Can change amount
- [ ] Suggested amount badge shows
- [ ] Note optional
- [ ] Confirmation works
- [ ] Updates loan schedule
- [ ] Success toast appears

### Edit Screen
- [ ] Form pre-filled
- [ ] Shows warning if has payments
- [ ] Can update all fields
- [ ] Validation works
- [ ] Save updates loan

---

## 🏠 **Assets**

### List Screen
- [ ] Assets load correctly
- [ ] Shows current value
- [ ] Appreciation/depreciation indicator
- [ ] Shows total assets value
- [ ] Empty state displays
- [ ] Tap navigates to detail

### Create Screen
- [ ] Asset kind picker works (Real Estate, Vehicle, etc.)
- [ ] Name field required
- [ ] Acquisition value input works
- [ ] Current value input works
- [ ] Acquisition date picker works
- [ ] Indexing rule optional (percentage)
- [ ] Validation works
- [ ] Success toast appears

### Detail Screen
- [ ] Shows all asset info
- [ ] Appreciation percentage calculated correctly
- [ ] Color coding (green=+, red=-)
- [ ] "Revalue" button navigates
- [ ] Edit button works
- [ ] Delete shows confirmation

### Revalue Screen
- [ ] Pre-fills current value
- [ ] Date picker works
- [ ] Shows change calculation (amount & %)
- [ ] Color codes positive/negative change
- [ ] Confirmation works
- [ ] Updates asset value
- [ ] Success toast appears

---

## 📁 **Categories**

### List Screen
- [ ] Categories grouped by kind (Expense, Income, Asset, Loan)
- [ ] Hierarchical display with indentation
- [ ] Parent categories show first
- [ ] Child categories indented
- [ ] Swipe actions work
- [ ] Empty state displays
- [ ] "+ Add" button works

### CRUD (if implemented)
- [ ] Can create new category
- [ ] Can select parent category
- [ ] Can edit category
- [ ] Can delete category (with confirmation)

---

## 🏘️ **Household**

### Household Screen
- [ ] Current household displays
- [ ] Shows member count
- [ ] Members list displays
- [ ] Member avatars show initials
- [ ] Member roles display (Admin, Member, Viewer)
- [ ] "Invite" button works

### Household Switcher (if multiple households)
- [ ] Shows list of households
- [ ] Current household marked
- [ ] Can switch household
- [ ] Data reloads after switch
- [ ] Success toast appears

---

## 📊 **Summaries**

### List Screen
- [ ] Monthly summaries load
- [ ] Shows income total
- [ ] Shows expense total
- [ ] Shows loan payments
- [ ] Shows cash flow (income - expenses - loans)
- [ ] Shows net worth
- [ ] Cash flow color coded (green/red)
- [ ] Pull-to-refresh works
- [ ] Empty state displays

---

## ⚙️ **Settings**

### Settings Screen
- [ ] Profile section displays
- [ ] User avatar/initials show
- [ ] Email displays
- [ ] Menu items navigable
- [ ] Logout button shows confirmation
- [ ] Logout works correctly
- [ ] Version number displays

---

## 🔔 **Push Notifications**

### Permission
- [ ] Requests permission on first launch
- [ ] Handles "Allow" correctly
- [ ] Handles "Deny" gracefully

### Notifications (if backend sending)
- [ ] Receives notifications
- [ ] Shows in notification center
- [ ] Tap opens app
- [ ] Navigates to relevant screen
- [ ] Badge count updates

---

## 🎨 **UI/UX Polish**

### Animations
- [ ] Button scale animation on press
- [ ] Input border animates on focus
- [ ] Skeleton loaders show while loading
- [ ] Toast slides in/out smoothly
- [ ] Modal slides up from bottom
- [ ] List items animate on entrance

### Haptic Feedback
- [ ] Button presses have haptic feedback
- [ ] Swipe actions have feedback
- [ ] Success actions have success haptic
- [ ] Error actions have error haptic
- [ ] Delete confirmation has warning haptic

### Loading States
- [ ] Skeleton loaders show on initial load
- [ ] Spinners show during save/delete
- [ ] Button shows loading state (spinner + disabled)
- [ ] Pull-to-refresh indicator works

### Empty States
- [ ] Empty states have emoji icon
- [ ] Empty states have descriptive text
- [ ] Empty states have CTA button
- [ ] CTA navigates to create screen

### Error Handling
- [ ] Network errors show user-friendly message
- [ ] Timeout errors show retry option
- [ ] API errors show specific message
- [ ] Form validation errors clear and helpful
- [ ] Toast auto-dismisses after 3-5s

---

## 📱 **Device Testing**

### iOS
- [ ] iPhone SE (small screen)
- [ ] iPhone 12/13/14 (standard)
- [ ] iPhone 14 Pro Max (large)
- [ ] iPad (if applicable)

### Android
- [ ] Small phone (5.5")
- [ ] Standard phone (6.1")
- [ ] Large phone (6.7"+)

---

## 🌐 **Network Scenarios**

### Online
- [ ] All features work with good connection
- [ ] Data loads quickly

### Slow Network
- [ ] Shows loading indicators
- [ ] Timeout after 30s
- [ ] Retry button works

### Offline
- [ ] Shows network error
- [ ] Doesn't crash app
- [ ] Can retry when back online

---

## 🔒 **Security**

- [ ] API calls use HTTPS
- [ ] Auth token included in requests
- [ ] Session persists securely
- [ ] Sensitive data not logged
- [ ] No API keys in source code

---

## ⚡ **Performance**

### App Launch
- [ ] Launches in < 3 seconds
- [ ] No white screen flash
- [ ] Splash screen displays

### Screen Load
- [ ] Screens load in < 1 second with data
- [ ] Shows skeleton loader immediately

### Scrolling
- [ ] Lists scroll smoothly (60 FPS feel)
- [ ] No lag with 100+ items
- [ ] Pull-to-refresh smooth

### Memory
- [ ] No memory leaks after navigation
- [ ] App doesn't crash with extended use

---

## 🐛 **Known Issues**

_Document any bugs found during testing:_

1. 
2. 
3. 

---

## ✅ **Sign-Off**

### Testing Complete
- [ ] All critical paths tested
- [ ] All bugs documented
- [ ] Ready for production

**Tester Signature:** _____________  
**Date:** _____________

---

## 📝 **Notes**

_Additional observations or comments:_

---

**Testing Completed:** _____ / 150+ checkboxes

