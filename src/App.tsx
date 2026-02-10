import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/Layout';
import { OffersList } from './components/OffersList';
import { SalesDashboard } from './components/SalesDashboard';
import { SettingsPage } from './components/SettingsPage';
import { MigrationPage } from './components/MigrationPage';
import { RegisterPage } from './components/RegisterPage';
import { UserManagementPage } from './components/UserManagementPage';
import { SalesTeamDashboard } from './components/admin/SalesTeamDashboard';
import { PartnerOffersPage } from './components/admin/PartnerOffersPage';
import { ActivityLogsPage } from './components/admin/ActivityLogsPage';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ManagerDashboard } from './components/admin/ManagerDashboard';
import { InstallerManagementPanel } from './components/admin/InstallerManagementPanel';
import { TeamManagementPanel } from './components/admin/TeamManagementPanel';
import { FuelLogManager } from './components/admin/FuelLogManager';
import { FailureReportManager } from './components/admin/FailureReportManager';
import { PricingPage } from './components/admin/PricingPage';
import { InstallationProfitability } from './components/admin/InstallationProfitability';
import { SystemPermissionsPage } from './components/admin/SystemPermissionsPage';
import { InventoryDashboard } from './components/inventory/InventoryDashboard';
import { ServiceDashboard } from './components/service/ServiceDashboard';
import { InstallerRequestsPage } from './components/installer/InstallerRequestsPage';
import { InstallerDashboard } from './components/installer/InstallerDashboard';
import { InstallationAcceptance } from './components/installer/InstallationAcceptance';
import { InstallerLayout } from './components/installer/InstallerLayout';
import { InstallerCalendarPage } from './components/installer/InstallerCalendarPage';
import { FailureReportForm } from './components/installer/FailureReportForm';
import { InstallerSettingsPage } from './components/installer/InstallerSettingsPage';
import { FuelPage } from './components/fuel/FuelPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ReportsList } from './components/reports/ReportsList';
import { ReportForm } from './components/reports/ReportForm';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/LoginPage';
import { InstallationDashboard } from './components/installations/InstallationDashboard';
import { PortfolioDashboard } from './components/installations/PortfolioDashboard';
import { NewOfferPage } from './pages/NewOfferPage';
import { WalletPage } from './components/admin/WalletPage';
import { ManagerWalletPage } from './components/admin/ManagerWalletPage';
import { MeasurementDashboard } from './components/measurements/MeasurementDashboard';
import { MeasurementReportsList } from './components/reports/MeasurementReportsList';
import { ContractsList } from './components/contracts/ContractsList';
import { ContractDetails } from './components/contracts/ContractDetails';
import { DeliveryCalendar } from './components/delivery/DeliveryCalendar';
import { LogisticsCalendar } from './components/logistics/LogisticsCalendar';
import { ProcurementDashboard } from './components/logistics/ProcurementDashboard';
import { CalendarV3 } from './components/calendar-v3/CalendarV3';
import { CustomersList } from './components/customers/CustomersList';
import { CustomerPage } from './components/customers/CustomerPage';
import { LeadsList } from './components/leads/LeadsList';
import { LeadForm } from './components/leads/LeadForm';
import { LeadDetailsPage } from './components/leads/LeadDetailsPage';
import { MailPage } from './components/MailPage';
import { CustomerDetailsPage } from './pages/CustomerDetailsPage';
import { FairDashboard } from './components/fairs/FairDashboard';
import { FairManagement } from './components/admin/FairManagement';
import { EmailTemplatesPage } from './pages/admin/EmailTemplatesPage';
import { ErrorReportsPage } from './pages/admin/ErrorReportsPage';
import { PricingV2Page } from './pages/admin/PricingV2Page';
import { PriceTableBrowserPage } from './pages/admin/PriceTableBrowserPage';
import { B2BPartnersPage } from './pages/admin/B2BPartnersPage';
import { B2BOrdersAdminPage } from './pages/admin/B2BOrdersAdminPage';
import { B2BOffersAdminPage } from './pages/admin/B2BOffersAdminPage';
import { AIAssistantPage } from './components/admin/AIAssistantPage';
import { KnowledgeBaseManager } from './components/admin/KnowledgeBaseManager';
import { TechnicalAssistant } from './components/chat/TechnicalAssistant';
import { VisualizerPage } from './pages/VisualizerPage';
import ServiceRequestPage from './pages/public/ServiceRequestPage';
import { ServiceTicketDetailsPage } from './components/service/ServiceTicketDetailsPage';
import { PublicOfferPage } from './pages/PublicOfferPage';
import { CallManager } from './components/telephony/CallManager';
import { TaskBoard } from './components/tasks/TaskBoard';
import { LandingPage } from './components/LandingPage';
import { PartnerLoginPage } from './components/partner/PartnerLoginPage';
import { PartnerRegisterPage } from './components/partner/PartnerRegisterPage';
import { PartnerLayout } from './components/partner/PartnerLayout';
import { ScrollToTop } from './components/ScrollToTop';
import { FuelRegistryPublic } from './pages/FuelRegistryPublic';

// B2B Partner Portal
import { B2BLayout } from './pages/b2b/B2BLayout';
import { B2BDashboard } from './pages/b2b/B2BDashboard';
import { B2BOffersPage } from './pages/b2b/B2BOffersPage';
import { B2BOrdersPage } from './pages/b2b/B2BOrdersPage';
import { B2BPromotionsPage } from './pages/b2b/B2BPromotionsPage';
import { B2BCreditPage } from './pages/b2b/B2BCreditPage';
import { B2BMaterialsPage } from './pages/b2b/B2BMaterialsPage';
import { B2BInvoicesPage } from './pages/b2b/B2BInvoicesPage';
import { B2BLoginPage } from './pages/b2b/B2BLoginPage';
import { B2BCalculator } from './components/b2b/calculator/B2BCalculator';

// B2B Admin
import { B2BPromotionsAdminPage } from './pages/admin/B2BPromotionsAdminPage';
import { B2BCreditAdminPage } from './pages/admin/B2BCreditAdminPage';
import { B2BPartnerAnalyticsPage } from './pages/admin/B2BPartnerAnalyticsPage';
import { MarketingManagerPage } from './pages/admin/MarketingManagerPage';
import { ProductImagesPage } from './pages/admin/ProductImagesPage';

import { OfferPrintView } from './pages/print/OfferPrintView';
import { DachrechnerPage } from './pages/DachrechnerPage';

// Lazy load heavy components to avoid module evaluation crashes
const ProductConfiguratorV2 = React.lazy(() => import('./components/calculator_v2/ProductConfiguratorV2').then(m => ({ default: m.ProductConfiguratorV2 })));

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
    if (currentUser.role === 'b2b_partner') return <Navigate to="/b2b/dashboard" replace />;
    if (currentUser.role === 'partner') return <Navigate to="/b2b/dashboard" replace />;
    if (currentUser.role === 'installer') return <Navigate to="/installer" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function DashboardRouter() {
  const { currentUser } = useAuth();
  if (currentUser?.role === 'admin') return <AdminDashboard />;
  if (currentUser?.role === 'manager') return <ManagerDashboard />;
  return <SalesDashboard />;
}

// Wallet router - show full wallet for admin, limited for manager
function WalletRouter() {
  const { currentUser } = useAuth();
  // Admin sees full wallet with balance
  if (currentUser?.role === 'admin') return <WalletPage />;
  // Manager sees limited wallet without balance
  return <ManagerWalletPage />;
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/p/offer/:token" element={<PublicOfferPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/reklamation" element={<ServiceRequestPage />} />
            <Route path="/partner/login" element={<Navigate to="/b2b/login" replace />} />
            <Route path="/partner/register" element={<PartnerRegisterPage />} />
            <Route path="/b2b/login" element={<B2BLoginPage />} />
            <Route path="/b2b/register" element={<PartnerRegisterPage />} />
            <Route path="/print/offer/:token" element={<OfferPrintView />} />
            <Route path="/fuel-registry" element={<FuelRegistryPublic />} />

            {/* Sales Rep / Admin Routes */}
            <Route element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'sales_rep']}>
                <>
                  <CallManager />
                  <Layout />
                </>
              </ProtectedRoute>
            }>
              <Route path="/dashboard" element={<DashboardRouter />} />
              <Route path="/offers" element={<OffersList />} />
              <Route path="/new-offer" element={
                <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div></div>}>
                  <ProductConfiguratorV2 />
                </Suspense>
              } />
              {/* Legacy V1 calculator - kept for backwards compatibility */}
              <Route path="/v1" element={<NewOfferPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/migration" element={<MigrationPage />} />
              <Route path="/admin/users" element={<UserManagementPage />} />
              <Route path="/admin/stats" element={<SalesTeamDashboard />} />
              <Route path="/admin/partner-offers" element={<PartnerOffersPage />} />
              <Route path="/admin/installers" element={<InstallerManagementPanel />} />
              <Route path="/admin/teams" element={<TeamManagementPanel />} />
              <Route path="/admin/wallet" element={<WalletRouter />} />
              <Route path="/reports" element={<ReportsList />} />
              <Route path="/reports/new" element={<ReportForm />} />
              <Route path="/reports/measurements" element={<MeasurementReportsList />} />
              <Route path="/measurements" element={<MeasurementDashboard />} />
              <Route path="/installations" element={<InstallationDashboard />} />
              <Route path="/portfolio" element={<PortfolioDashboard />} />
              <Route path="/contracts" element={<ContractsList />} />
              <Route path="/contracts/:id" element={<ContractDetails />} />
              <Route path="/dachrechner" element={<DachrechnerPage />} />
              <Route path="/deliveries" element={<DeliveryCalendar />} />
              <Route path="/admin/fuel-logs" element={<FuelLogManager />} />
              <Route path="/admin/failures" element={<FailureReportManager />} />
              <Route path="admin/pricing" element={<ProtectedRoute allowedRoles={['admin']}><PriceTableBrowserPage /></ProtectedRoute>} />
              {/* Legacy pricing pages - kept for backwards compatibility */}
              <Route path="admin/pricing-old" element={<ProtectedRoute allowedRoles={['admin']}><PricingPage /></ProtectedRoute>} />
              <Route path="admin/pricing-v2" element={<ProtectedRoute allowedRoles={['admin']}><PricingV2Page /></ProtectedRoute>} />
              <Route path="admin/product-images" element={<ProtectedRoute allowedRoles={['admin']}><ProductImagesPage /></ProtectedRoute>} />
              <Route path="admin/inventory" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><InventoryDashboard /></ProtectedRoute>} />
              <Route path="admin/logs" element={<ProtectedRoute allowedRoles={['admin']}><ActivityLogsPage /></ProtectedRoute>} />
              <Route path="/admin/profitability" element={<InstallationProfitability />} />
              <Route path="/admin/notifications" element={<ProtectedRoute allowedRoles={['admin']}><SystemPermissionsPage /></ProtectedRoute>} />
              <Route path="/admin/fairs" element={<ProtectedRoute allowedRoles={['admin']}><FairManagement /></ProtectedRoute>} />
              <Route path="/admin/email-templates" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'sales_rep']}><EmailTemplatesPage /></ProtectedRoute>} />
              {/* B2B Admin Routes */}
              <Route path="/admin/b2b/partners" element={<ProtectedRoute allowedRoles={['admin', 'b2b_manager']}><B2BPartnersPage /></ProtectedRoute>} />
              <Route path="/admin/b2b/orders" element={<ProtectedRoute allowedRoles={['admin', 'b2b_manager']}><B2BOrdersAdminPage /></ProtectedRoute>} />
              <Route path="/admin/b2b/promotions" element={<ProtectedRoute allowedRoles={['admin', 'b2b_manager']}><B2BPromotionsAdminPage /></ProtectedRoute>} />
              <Route path="/admin/b2b/credit" element={<ProtectedRoute allowedRoles={['admin', 'b2b_manager']}><B2BCreditAdminPage /></ProtectedRoute>} />
              <Route path="/admin/b2b/analytics" element={<ProtectedRoute allowedRoles={['admin', 'b2b_manager']}><B2BPartnerAnalyticsPage /></ProtectedRoute>} />
              <Route path="/admin/b2b/offers" element={<ProtectedRoute allowedRoles={['admin', 'b2b_manager', 'manager']}><B2BOffersAdminPage /></ProtectedRoute>} />
              <Route path="/admin/b2b/marketing" element={<ProtectedRoute allowedRoles={['admin', 'b2b_manager', 'manager']}><MarketingManagerPage /></ProtectedRoute>} />
              <Route path="/admin/error-reports" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><ErrorReportsPage /></ProtectedRoute>} />
              <Route path="/fairs" element={<FairDashboard />} />
              <Route path="/fuel-logs" element={<FuelPage />} />
              <Route path="/service" element={<ServiceDashboard />} />
              <Route path="/service/:id" element={<ServiceTicketDetailsPage />} />
              <Route path="/logistics" element={<LogisticsCalendar />} />
              <Route path="/calendar-v3" element={<CalendarV3 />} />
              <Route path="/procurement" element={<ProcurementDashboard />} />
              <Route path="/customers" element={<CustomersList />} />
              <Route path="/customers/new" element={<CustomerPage />} />
              <Route path="/customers/:id" element={<CustomerDetailsPage />} />
              <Route path="/leads" element={<LeadsList />} />
              <Route path="/leads/new" element={<LeadForm />} />
              <Route path="/leads/:id" element={<LeadDetailsPage />} />
              <Route path="/mail" element={<MailPage />} />
              <Route path="/tasks" element={<TaskBoard />} />
              <Route path="/ai-assistant" element={<AIAssistantPage />} />
              <Route path="/admin/tech-assistant" element={<TechnicalAssistant />} />
              <Route path="/admin/knowledge" element={<KnowledgeBaseManager />} />
              <Route path="/visualizer" element={<VisualizerPage />} />
            </Route>

            {/* Partner Protected Routes - Redirect to B2B */}
            <Route path="/partner/*" element={<Navigate to="/b2b/dashboard" replace />} />

            {/* B2B Partner Portal Routes */}
            <Route path="/b2b" element={
              <ProtectedRoute allowedRoles={['b2b_partner', 'partner', 'admin', 'b2b_manager']}>
                <B2BLayout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<B2BDashboard />} />
              <Route path="calculator" element={
                <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
                  <B2BCalculator />
                </Suspense>
              } />
              <Route path="offers" element={<B2BOffersPage />} />
              <Route path="orders" element={<B2BOrdersPage />} />
              <Route path="promotions" element={<B2BPromotionsPage />} />
              <Route path="materials" element={<B2BMaterialsPage />} />
              <Route path="credit" element={<B2BCreditPage />} />
              <Route path="invoices" element={<B2BInvoicesPage />} />
              <Route index element={<Navigate to="/b2b/dashboard" replace />} />
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
