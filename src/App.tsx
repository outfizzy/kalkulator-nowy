import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { Layout } from './components/Layout';
import { CustomerForm } from './components/CustomerForm';
import { ProductConfigurator } from './components/ProductConfigurator';
import { OfferSummary } from './components/OfferSummary';
import { MarginControl } from './components/MarginControl';
import { OffersList } from './components/OffersList';
import { SalesDashboard } from './components/SalesDashboard';
import { SettingsPage } from './components/SettingsPage';
import { MigrationPage } from './components/MigrationPage';
import { RegisterPage } from './components/RegisterPage';
import { UserManagementPage } from './components/UserManagementPage';
import { SalesTeamDashboard } from './components/admin/SalesTeamDashboard';
import { PartnerOffersPage } from './components/admin/PartnerOffersPage';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { calculatePrice } from './utils/pricing';
import { calculateCommission } from './utils/commission';
import { DatabaseService } from './services/database';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ReportsList } from './components/reports/ReportsList';
import { ReportForm } from './components/reports/ReportForm';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/LoginPage';
import { InstallationDashboard } from './components/installations/InstallationDashboard';
import { ContractsList } from './components/contracts/ContractsList';
import { ContractDetails } from './components/contracts/ContractDetails';

// Partner Components
import { LandingPage } from './components/LandingPage';
import { PartnerLoginPage } from './components/partner/PartnerLoginPage';
import { PartnerRegisterPage } from './components/partner/PartnerRegisterPage';
import { PartnerLayout } from './components/partner/PartnerLayout';

import type { Customer, ProductConfig, Offer, SnowZoneInfo } from './types';

type Step = 'customer' | 'product' | 'summary';

// Protected Route component
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactElement, allowedRoles?: string[] }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
    </div>;
  }

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    // Redirect based on role if trying to access unauthorized area
    if (currentUser.role === 'partner') return <Navigate to="/partner/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}



function DashboardRouter() {
  const { currentUser } = useAuth();

  if (currentUser?.role === 'admin' || currentUser?.role === 'manager') {
    return <AdminDashboard />;
  }

  return <SalesDashboard />;
}

function NewOfferPage({ mode = 'standard' }: { mode?: 'standard' | 'partner' }) {
  const { currentUser } = useAuth();
  const [step, setStep] = useState<Step>('customer');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [snowZone, setSnowZone] = useState<SnowZoneInfo | null>(null);
  const [product, setProduct] = useState<ProductConfig | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [margin, setMargin] = useState<number>(mode === 'partner' ? 0.25 : 0.40); // Lower default margin for partners

  const handleCustomerComplete = (data: Customer, zone: SnowZoneInfo) => {
    setCustomer(data);
    setSnowZone(zone);
    setStep('product');
  };

  const handleProductComplete = async (config: ProductConfig) => {
    setProduct(config);

    if (customer && snowZone && currentUser) {
      const pricing = calculatePrice(config, margin, snowZone, customer.postalCode);

      try {
        // Partners might not have soldOffersCount logic or it might be different
        const soldOffersCount = mode === 'partner' ? 0 : await DatabaseService.getSoldOffersCount(currentUser.id);

        // Commission: 5% of Net Selling Price (including installation)
        const commission = calculateCommission(pricing.sellingPriceNet, pricing.marginPercentage, soldOffersCount);

        const newOffer: Omit<Offer, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> = {
          offerNumber: `OFF/${new Date().getFullYear()}/${Math.floor(Math.random() * 10000)}`, // Temp number generation
          status: 'draft',
          customer,
          snowZone,
          product: config,
          pricing,
          commission,
        };

        const savedOffer = await DatabaseService.createOffer(newOffer);
        toast.success('Oferta utworzona pomyślnie!');
        setOffer(savedOffer);
        setStep('summary');
      } catch (error) {
        console.error('Error creating offer:', error);
        toast.error('Błąd podczas tworzenia oferty');
      }
    }
  };

  const handleMarginChange = async (newMargin: number) => {
    setMargin(newMargin);
    if (offer && currentUser) {
      const newPricing = calculatePrice(offer.product, newMargin, offer.snowZone, offer.customer.postalCode);

      try {
        const soldOffersCount = mode === 'partner' ? 0 : await DatabaseService.getSoldOffersCount(currentUser.id);
        const newCommission = calculateCommission(newPricing.sellingPriceNet, newPricing.marginPercentage, soldOffersCount);

        const updatedOffer = {
          ...offer,
          pricing: newPricing,
          commission: newCommission,
          updatedAt: new Date(),
        };

        await DatabaseService.updateOffer(offer.id, {
          pricing: newPricing,
          commission: newCommission
        });
        setOffer(updatedOffer);
      } catch (error) {
        console.error('Error updating offer:', error);
        toast.error('Błąd aktualizacji oferty');
      }
    }
  };

  const handleReset = () => {
    setStep('customer');
    setCustomer(null);
    setSnowZone(null);
    setProduct(null);
    setOffer(null);
    setMargin(mode === 'partner' ? 0.25 : 0.40);
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
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Partner Public Routes */}
            <Route path="/partner/login" element={<PartnerLoginPage />} />
            <Route path="/partner/register" element={<PartnerRegisterPage />} />

            {/* Sales Rep / Admin Routes */}
            <Route element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'sales_rep']}>
                <Layout />
              </ProtectedRoute>
            }>
              <Route path="/dashboard" element={<DashboardRouter />} />
              <Route path="/offers" element={<OffersList />} />
              <Route path="/new-offer" element={<NewOfferPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/migration" element={<MigrationPage />} />
              <Route path="/admin/users" element={<UserManagementPage />} />
              <Route path="/admin/stats" element={<SalesTeamDashboard />} />
              <Route path="/admin/partner-offers" element={<PartnerOffersPage />} />
              <Route path="/reports" element={<ReportsList />} />
              <Route path="/reports/new" element={<ReportForm />} />
              <Route path="/installations" element={<InstallationDashboard />} />
              <Route path="/contracts" element={<ContractsList />} />
              <Route path="/contracts/:id" element={<ContractDetails />} />
            </Route>



            {/* Partner Protected Routes */}
            <Route path="/partner" element={
              <ProtectedRoute allowedRoles={['partner']}>
                <PartnerLayout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<OffersList />} /> {/* Reusing OffersList for now */}
              <Route path="new-offer" element={<NewOfferPage mode="partner" />} />
              <Route path="offers" element={<OffersList />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route index element={<Navigate to="/partner/dashboard" replace />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
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
