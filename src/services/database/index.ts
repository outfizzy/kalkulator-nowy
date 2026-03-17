import { ActivityService } from './activity.service';
import { CommunicationService } from './communication.service';
import { ContractService } from './contract.service';
import { CustomerService } from './customer.service';
import { FinanceService } from './finance.service';
import { InstallationService } from './installation.service';
import { InventoryService } from './inventory.service';
import { LeadService } from './lead.service';
import { LeadAutoAssignService } from './lead-auto-assign.service';
import { MeasurementService } from './measurement.service';
import { NoteService } from './note.service';
import { NotificationService } from './notification.service';
import { OfferService } from './offer.service';
import { OrderService } from './order.service';
import { ProcurementService } from './procurement.service';
import { SearchService } from './search.service';
import { ServiceService } from './service.service';
import { SettingsService } from './settings.service';
import { StorageService } from './storage.service';
import { SupportService } from './support.service';
import { TaskService } from './task.service';
import { UserService } from './user.service';

export const DatabaseService = {
    ...ActivityService,
    ...CommunicationService,
    ...ContractService,
    ...CustomerService,
    ...FinanceService,
    ...InstallationService,
    ...InventoryService,
    ...LeadService,
    ...MeasurementService,
    ...NoteService,
    ...NotificationService,
    ...OfferService,
    ...OrderService,
    ...ProcurementService,
    ...SearchService,
    ...ServiceService,
    ...SettingsService,
    ...StorageService,
    ...SupportService,
    ...TaskService,
    ...UserService,
    ...ProjectMeasurementService
};

export * from './activity.service';
export * from './communication.service';
export * from './contract.service';
export * from './customer.service';
export * from './finance.service';
export * from './installation.service';
export * from './inventory.service';
export * from './lead.service';
export * from './measurement.service';
export * from './project-measurement.service';
export * from './note.service';
export * from './notification.service';
export * from './offer.service';
export * from './order.service';
export * from './procurement.service';
export * from './search.service';
export * from './service.service';
export * from './settings.service';
export * from './storage.service';
export * from './support.service';
export * from './task.service';
export * from './user.service';
export * from './user.service';
export * from './email-template.service';
export * from './lead-auto-assign.service';
