import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
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
import { InstallerManagementPanel } from './components/admin/InstallerManagementPanel';
import { TeamManagementPanel } from './components/admin/TeamManagementPanel';
import { OrderRequestManager } from './components/admin/OrderRequestManager';
import { FuelLogManager } from './components/admin/FuelLogManager';
import { FailureReportManager } from './components/admin/FailureReportManager';
import { InstallerRequestsPage } from './components/installer/InstallerRequestsPage';
import { InstallerDashboard } from './components/installer/InstallerDashboard';
import { InstallationAcceptance } from './components/installer/InstallationAcceptance';
import { InstallerLayout } from './components/installer/InstallerLayout';
import { InstallerCalendarPage } from './components/installer/InstallerCalendarPage';
import { FailureReportForm } from './components/installer/FailureReportForm';
import { InstallerSettingsPage } from './components/installer/InstallerSettingsPage';
import { FuelPage } from './components/fuel/FuelPage';
import { calculatePrice } from './utils/pricing';
import { calculateCommission } from './utils/commission';
import { DatabaseService } from './services/database';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ReportsList } from './components/reports/ReportsList';
import { ReportForm } from './components/reports/ReportForm';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/LoginPage';
import { InstallationDashboard } from './components/installations/InstallationDashboard';

import { WalletPage } from './components/admin/WalletPage';
import { MeasurementDashboard } from './components/measurements/MeasurementDashboard';
import { ContractsList } from './components/contracts/ContractsList';
import { ContractDetails } from './components/contracts/ContractDetails';
import { DeliveryCalendar } from './components/delivery/DeliveryCalendar';
import { LogisticsCalendar } from './components/logistics/LogisticsCalendar';
import { CustomersList } from './components/customers/CustomersList';
import { CustomerPage } from './components/customers/CustomerPage';
import { MailPage } from './components/MailPage';

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
    if (currentUser.role === 'installer') return <Navigate to="/installer" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}



import { ManagerDashboard } from './components/admin/ManagerDashboard';

function DashboardRouter() {
  const { currentUser } = useAuth();

  if (currentUser?.role === 'admin') {
    return <AdminDashboard />;
  }

  if (currentUser?.role === 'manager') {
    return <ManagerDashboard />;
  }

  return <SalesDashboard />;
}

function NewOfferPage({ mode = 'standard' }: { mode?: 'standard' | 'partner' }) {
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const initialPhone = searchParams.get('phone');

  const [step, setStep] = useState<Step>('customer');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [snowZone, setSnowZone] = useState<SnowZoneInfo | null>(null);
  const [product, setProduct] = useState<ProductConfig | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [margin, setMargin] = useState<number>(0.40);

  // Set initial margin based on user role / mode
  useEffect(() => {
    if (mode === 'partner') {
      setMargin(currentUser?.partnerMargin ?? 0.25);
    } else {
      setMargin(0.40);
    }
  }, [mode, currentUser]);

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

        // Commission: Use user's individual rate or default 5%
        const userCommissionRate = currentUser.commissionRate ?? 0.05;
        const commission = calculateCommission(pricing.sellingPriceNet, pricing.marginPercentage, soldOffersCount, userCommissionRate);

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
        const userCommissionRate = currentUser.commissionRate ?? 0.05;
        const newCommission = calculateCommission(newPricing.sellingPriceNet, newPricing.marginPercentage, soldOffersCount, userCommissionRate);

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
    setMargin(mode === 'partner' ? (currentUser?.partnerMargin ?? 0.25) : 0.40);
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
          <CustomerForm
            onComplete={handleCustomerComplete}
            initialData={initialPhone ? { phone: initialPhone } as Customer : customer || undefined}
          />
        )}

        {step === 'product' && (
          <ProductConfigurator onComplete={handleProductComplete} initialData={product || undefined} />
        )}

        {step === 'summary' && offer && (
          <div className="space-y-6">
            <div className="print:hidden">
              {mode === 'partner' ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-800">Marża partnera B2B</h3>
                  <p className="mt-2 text-2xl font-bold text-accent">
                    {Math.round(margin * 100)}%
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Marża ustalona przez administratora. Ceny w konfiguratorze uwzględniają tę marżę.
                  </p>
                </div>
              ) : (
                <MarginControl
                  value={margin}
                  onChange={handleMarginChange}
                  purchasePrice={offer.pricing.totalCost}
                  sellingPrice={offer.pricing.sellingPriceNet}
                />
              )}
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
              <Route path="/admin/installers" element={<InstallerManagementPanel />} />
              <Route path="/admin/teams" element={<TeamManagementPanel />} />
              <Route path="/admin/wallet" element={<WalletPage />} />
              <Route path="/reports" element={<ReportsList />} />
              <Route path="/reports/new" element={<ReportForm />} />
              <Route path="/measurements" element={<MeasurementDashboard />} />
              <Route path="/installations" element={<InstallationDashboard />} />
              <Route path="/contracts" element={<ContractsList />} />
              <Route path="/contracts/:id" element={<ContractDetails />} />
              <Route path="/deliveries" element={<DeliveryCalendar />} />
              <Route path="/admin/requests" element={<OrderRequestManager />} />
              <Route path="/admin/fuel-logs" element={<FuelLogManager />} />
              <Route path="/admin/failures" element={<FailureReportManager />} />
              <Route path="/admin/failures" element={<FailureReportManager />} />
              <Route path="/fuel-logs" element={<FuelPage />} />

              {/* CRM & Logistics */}
              <Route path="/logistics" element={<LogisticsCalendar />} />

              {/* Customers Module */}
              <Route path="/customers" element={<CustomersList />} />
              <Route path="/customers/new" element={<CustomerPage />} />
              <Route path="/customers/:id" element={<CustomerPage />} />
              <Route path="/mail" element={<MailPage />} />
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

            {/* Installer Protected Routes */}
            <Route path="/installer" element={
              <ProtectedRoute allowedRoles={['installer']}>
                <InstallerLayout />
              </ProtectedRoute>
            }>
              <Route path="calendar" element={<InstallerCalendarPage />} />
              <Route path="requests" element={<InstallerRequestsPage />} />
              <Route path="fuel" element={<FuelPage />} />
              <Route path="failure-report" element={<FailureReportForm />} />
              <Route path="settings" element={<InstallerSettingsPage />} />
              <Route path="acceptance/:installationId" element={<InstallationAcceptance />} />
              <Route index element={<InstallerDashboard />} />
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
