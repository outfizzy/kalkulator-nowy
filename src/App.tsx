import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { Layout } from './components/Layout';
import { CustomerForm } from './components/CustomerForm';
import { ProductConfigurator } from './components/ProductConfigurator';
import { OfferSummary } from './components/OfferSummary';
import { MarginControl } from './components/MarginControl';
// import { Dashboard } from './components/Dashboard'; // Replaced by SalesDashboard
import { OffersList } from './components/OffersList';
import { SalesDashboard } from './components/SalesDashboard';
import { SettingsPage } from './components/SettingsPage';
import { calculatePrice } from './utils/pricing';
import { calculateCommission } from './utils/commission';
import { saveOffer, getCommissionStats } from './utils/storage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ReportsList } from './components/reports/ReportsList';
import { ReportForm } from './components/reports/ReportForm';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/LoginPage';
import { InstallationDashboard } from './components/installations/InstallationDashboard';
import { ContractsList } from './components/contracts/ContractsList';
import { ContractDetails } from './components/contracts/ContractDetails';
import type { Customer, ProductConfig, Offer, SnowZoneInfo } from './types';

type Step = 'customer' | 'product' | 'summary';

// Protected Route component
function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function NewOfferPage() {
  const { currentUser } = useAuth();
  const [step, setStep] = useState<Step>('customer');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [snowZone, setSnowZone] = useState<SnowZoneInfo | null>(null);
  const [product, setProduct] = useState<ProductConfig | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [margin, setMargin] = useState<number>(0.40); // Default 40%

  const handleCustomerComplete = (data: Customer, zone: SnowZoneInfo) => {
    setCustomer(data);
    setSnowZone(zone);
    setStep('product');
  };

  const handleProductComplete = (config: ProductConfig) => {
    setProduct(config);

    if (customer && snowZone) {
      const pricing = calculatePrice(config, margin, snowZone, customer.postalCode);
      const stats = getCommissionStats();
      // Commission: 5% of Net Selling Price (including installation)
      const commission = calculateCommission(pricing.sellingPriceNet, pricing.marginPercentage, stats.soldOffers);

      const newOffer: Offer = {
        id: Math.random().toString(36).substr(2, 9).toUpperCase(),
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'draft',
        customer,
        snowZone,
        product: config,
        pricing,
        commission,
        createdBy: currentUser?.id || 'unknown', // Assign to current user
      };

      saveOffer(newOffer);
      toast.success('Oferta utworzona pomyślnie!');
      setOffer(newOffer);
      setStep('summary');
    }
  };

  const handleMarginChange = (newMargin: number) => {
    setMargin(newMargin);
    if (offer) {
      const newPricing = calculatePrice(offer.product, newMargin, offer.snowZone, offer.customer.postalCode);
      const stats = getCommissionStats();
      const newCommission = calculateCommission(newPricing.sellingPriceNet, newPricing.marginPercentage, stats.soldOffers);

      const updatedOffer = {
        ...offer,
        pricing: newPricing,
        commission: newCommission,
        updatedAt: new Date(),
      };

      saveOffer(updatedOffer);
      setOffer(updatedOffer);
    }
  };

  const handleReset = () => {
    setStep('customer');
    setCustomer(null);
    setSnowZone(null);
    setProduct(null);
    setOffer(null);
    setMargin(0.40);
  };

  return (
    <>
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 -z-10" />

          <div className={`flex flex-col items-center gap-2 bg-background px-2 ${step === 'customer' || step === 'product' || step === 'summary' ? 'text-accent' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step === 'customer' ? 'bg-accent text-white' : (step === 'product' || step === 'summary' ? 'bg-accent text-white' : 'bg-slate-200 text-slate-500')}`}>
              1
            </div>
            <span className="text-xs font-medium">Klient</span>
          </div>

          <div className={`flex flex-col items-center gap-2 bg-background px-2 ${step === 'product' || step === 'summary' ? 'text-accent' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step === 'product' ? 'bg-accent text-white' : (step === 'summary' ? 'bg-accent text-white' : 'bg-slate-200 text-slate-500')}`}>
              2
            </div>
            <span className="text-xs font-medium">Konfiguracja</span>
          </div>

          <div className={`flex flex-col items-center gap-2 bg-background px-2 ${step === 'summary' ? 'text-accent' : 'text-slate-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step === 'summary' ? 'bg-accent text-white' : 'bg-slate-200 text-slate-500'}`}>
              3
            </div>
            <span className="text-xs font-medium">Podsumowanie</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="transition-all duration-300 ease-in-out">
        {step === 'customer' && (
          <CustomerForm onComplete={handleCustomerComplete} initialData={customer || undefined} />
        )}

        {step === 'product' && (
          <ProductConfigurator onComplete={handleProductComplete} initialData={product || undefined} />
        )}

        {step === 'summary' && offer && (
          <div className="space-y-6">
            <div className="print:hidden">
              <MarginControl
                value={margin}
                onChange={handleMarginChange}
                purchasePrice={offer.pricing.totalCost}
                sellingPrice={offer.pricing.sellingPriceNet}
              />
            </div>

            <OfferSummary offer={offer} onReset={handleReset} />
          </div>
        )}
      </div>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<SalesDashboard />} />
              <Route path="offers" element={<OffersList />} />
              <Route path="new-offer" element={<NewOfferPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="reports" element={<ReportsList />} />
              <Route path="reports/new" element={<ReportForm />} />
              <Route path="installations" element={<InstallationDashboard />} />
              <Route path="contracts" element={<ContractsList />} />
              <Route path="contracts/:id" element={<ContractDetails />} />
              {/* The installations route is now a top-level route */}
              {/* <Route path="installations" element={<InstallationDashboard />} /> */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#0f172a',
                color: '#fff',
              },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
