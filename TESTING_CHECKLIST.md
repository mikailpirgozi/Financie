# 🧪 Testing Checklist - Loan Performance Optimization

## ✅ Funkcionálne testovanie (Manual)

### Core Features
- [ ] **Initial page load** - Otvoriť `/dashboard/loans/[id]` - meraná performance  
- [ ] **Table virtualization** - Skrolovať tabuľku - má byť 60 FPS bez zasekovania
- [ ] **Pay installment** - Kliknúť na "Uhradiť" na ktorékoľvek splátke
  - [ ] Optimistic update - splátka sa hneď zmení na "Zaplatené"
  - [ ] API response - OK/error sa zobrazí
  - [ ] Rollback - ak API skončí s chybou, splátka sa vráti na pôvodný stav
- [ ] **Mark paid until today** - Kliknúť na "📅 Označiť splátky..."
  - [ ] Všetky pending/overdue splátky do dnešného dátumu budú označené ako "Zaplatené"
  - [ ] Počet označených splátok sa zobrazí
- [ ] **Regenerate schedule** - Ak je tabuľka prázdna, kliknúť na "Vygenerovať kalendár"
  - [ ] Splátkový kalendár sa vygeneruje
  - [ ] Tabuľka sa naplní

### React Query DevTools (Development)
- [ ] Otvoriť DevTools (dolný pravý roh v development mode)
  - [ ] Vidieť cache keys: `loan-schedule`, `loan-metrics`
  - [ ] Cache stav: `idle`, `success`, `error`
  - [ ] Sveža dáta sú v cache 5 minút (staleTime)
  - [ ] Po mutácii (pay, mark-paid) sa cache invaliduje a refetchne

### Performance Metrics
Zmeriť v Chrome DevTools > Performance tab:

- [ ] **Initial Load Time** - Čas od kliknutia na loan až po úplné zobrazenie
  - **Expected:** < 1s (pred optimalizáciou: 8-12s)
  - Metric: Lighthouse LCP (Largest Contentful Paint)

- [ ] **Table Scroll FPS** - Skrolovať virtualizovanú tabuľku
  - **Expected:** 60 FPS (pred: 15-25 FPS)
  - Tool: Chrome DevTools > Performance > FPS meter

- [ ] **Memory Usage** - Skrolovať tabuľku 5 minút
  - **Expected:** < 100MB (pred: 500MB+)
  - Tool: Chrome DevTools > Memory > Take heap snapshot

- [ ] **API Response Time** - V Network tab
  - `/api/loans/[id]/schedule?page=1&limit=50`
  - **Expected:** < 100ms (pred: 500-1000ms)

### Cache Validation
- [ ] **First request** - Network tab: vidiť plný response
- [ ] **Second request** (same page, 5s later) - vidiť cache headers
  - Header: `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`
- [ ] **Third request** (< 60s) - vidiť z cache (no network request)

### Error Handling
- [ ] **Network error** - Vypnúť internet, kliknúť na "Uhradiť"
  - [ ] Error message sa zobrazí
  - [ ] Splátka sa vrátí na pôvodný stav (rollback)
- [ ] **Unauthorized** - Odhlásiť sa, refreshovať
  - [ ] API vrátí 401
  - [ ] User sa presmeruje na login

## 🌐 Browser Testing

- [ ] **Chrome** (Desktop) - Primárny test
- [ ] **Firefox** - Kompatibilita
- [ ] **Safari** - Kompatibilita (ak máte Mac)
- [ ] **Mobile** - Chrome DevTools emulation (375x667)
  - [ ] Tabuľka sa zobrazí správne na malej obrazovke
  - [ ] Touch events fungujú (scroll, tap buttons)

## 📊 Lighthouse Audit

```bash
# Run Lighthouse
npx lighthouse http://localhost:3000/dashboard/loans/[id] \
  --only-categories=performance \
  --view
```

**Target scores:**
- [ ] Performance: > 90
- [ ] LCP (Largest Contentful Paint): < 2.5s
- [ ] FID (First Input Delay): < 100ms
- [ ] CLS (Cumulative Layout Shift): < 0.1

## 🐛 Known Issues / Edge Cases

- [ ] **Empty schedule** - Ak loan nemá schedule, pokazuje "Vygenerovať kalendár"
- [ ] **Large datasets** - 360 splátok sa virtualizuje bez problémov
- [ ] **Rapid clicks** - Kliknúť 2× rýchlo na "Uhradiť" - UI nedelá duplicate
- [ ] **Stale data** - Po 5 minút sa cache invaliduje a refetchne

## ✅ Final Sign-Off

- [ ] TypeScript: `pnpm typecheck` ✓
- [ ] Linting: `pnpm lint` ✓
- [ ] Performance tests passed
- [ ] All browsers tested
- [ ] Error handling verified
- [ ] Ready for production

---

**Notes:** 
- Tento checklist by mal byť vyplnený PRED deploymentom
- Ak sa testovanie vykoná na production environmente, DBakovať pred deployment
- DevTools sú dostupné len v development mode

