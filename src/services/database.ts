import { normalizePricing } from './database/base.service';
import { CustomerService } from './database/customer.service';
import { TaskService } from './database/task.service';
import { LeadService } from './database/lead.service';
import { OfferService } from './database/offer.service';
import { ContractService } from './database/contract.service';
import { InstallationService } from './database/installation.service';
import { UserService } from './database/user.service';
import { NoteService } from './database/note.service';
import { MeasurementService } from './database/measurement.service';
import { FinanceService } from './database/finance.service';
import { CommunicationService } from './database/communication.service';
import { SupportService } from './database/support.service';
import { OrderService } from './database/order.service';
import { NotificationService } from './database/notification.service';
import { StorageService } from './database/storage.service';

export const DatabaseService = {
    ...CustomerService,
    ...TaskService,
    ...LeadService,
    ...OfferService,
    ...ContractService,
    ...InstallationService,
    ...UserService,
    ...NoteService,
    ...StorageService,
    ...MeasurementService,
    ...FinanceService,
    ...CommunicationService,
    ...SupportService,
    ...OrderService,
    ...NotificationService,
    normalizePricing
};

export { normalizePricing };
