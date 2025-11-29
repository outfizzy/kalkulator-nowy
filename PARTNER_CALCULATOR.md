# Partner Offer Calculator (Kalkulator HURT) - Feature Documentation

## Overview

The Partner Offer Calculator is a wholesale-focused pricing tool for B2B partners. It uses the same full product configurator as sales representatives but with partner-specific pricing adjustments.

## Key Features

### 1. Lower Default Margin

- **Partners**: 25% margin (default)
- **Sales Reps**: 40% margin (default)
- Partners can still adjust margin if needed

### 2. Dedicated Navigation

Located in Partner Layout sidebar:

- **Pulpit** (Dashboard) - View existing offers
- **Nowa Oferta** (New Offer) - Create wholesale offers
- **Moje Oferty** (My Offers) - Browse partner's offers
- **Ustawienia** (Settings) - Account preferences

### 3. Full Product Configurator

Partners have access to the complete configurator with all options:

- Customer data entry
- Product configuration (dimensions, colors, options)
- Accessories (awnings, screens, gutters, etc.)
- Pricing summary with partner margins

### 4. Partner Branding

- Emerald color scheme (vs blue for sales reps)
- "Strefa Partnera" badge
- Company name display in sidebar

## Technical Implementation

### Route Configuration

```typescript
// App.tsx - Partner Routes
<Route path="/partner" element={
  <ProtectedRoute allowedRoles={['partner']}>
    <PartnerLayout />
  </ProtectedRoute>
}>
  <Route path="new-offer" element={<NewOfferPage mode="partner" />} />
  <Route path="offers" element={<OffersList />} />
  <Route path="dashboard" element={<OffersList />} />
  <Route path="settings" element={<SettingsPage />} />
</Route>
```

### Margin Logic

```typescript
// NewOfferPage component
const [margin, setMargin] = useState<number>(
  mode === 'partner' ? 0.25 : 0.40
);
```

### Commission Calculation

Partners don't have commission tracking (commission set to 0):

```typescript
const soldOffersCount = mode === 'partner' ? 0 : 
  await DatabaseService.getSoldOffersCount(currentUser.id);
```

## User Flow

### Creating an Offer as Partner

1. **Login** at `/partner/login`
2. **Navigate** to "Nowa Oferta" in sidebar
3. **Step 1**: Enter customer details and postal code
4. **Step 2**: Configure product (same as sales rep flow)
5. **Step 3**: Review pricing with 25% margin
6. **Adjust margin** if needed via margin control
7. **Generate PDF** or save offer

### Admin Visibility

Admins can:

- View all partner offers in Admin Dashboard
- Filter offers by partner company
- Track partner statistics separately
- Approve/block partner accounts

## Benefits for Partners

✅ **Wholesale Pricing**: Lower margins = competitive prices  
✅ **Same Tools**: Full configurator access  
✅ **Professional PDFs**: Branded offer documents  
✅ **Order Tracking**: View all submitted offers  
✅ **Quick Approval**: 24h account verification  

## Files Modified

- [`App.tsx`](file:///Users/tomaszfijolek/Desktop/Program%20do%20ofert%20/offer-app/src/App.tsx) - Partner routes with `mode="partner"`
- [`PartnerLayout.tsx`](file:///Users/tomaszfijolek/Desktop/Program%20do%20ofert%20/offer-app/src/components/partner/PartnerLayout.tsx) - Dedicated sidebar navigation
- [`NewOfferPage` in App.tsx](file:///Users/tomaszfijolek/Desktop/Program%20do%20ofert%20/offer-app/src/App.tsx#L61-L144) - Handles partner mode with 25% margin

## Next Steps

- [ ] Test partner offer creation flow end-to-end
- [ ] Verify margin appears correctly in database
- [ ] Confirm admin can view partner offers
- [ ] Test PDF generation for partner offers
