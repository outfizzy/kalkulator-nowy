// ============================================================================
// Shared Types for Configurator Trainer Automation System
// ============================================================================

// Worker configuration
export interface WorkerConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  pollIntervalMs: number;
  workerId: string;
  headless: boolean;
  screenshotDir: string;
}

// Recording step (matches RecordingStep in configurator-trainer.service.ts)
export interface AutomationRecordingStep {
  seq: number;
  action:
    | 'click'
    | 'input'
    | 'select'
    | 'navigate'
    | 'scroll'
    | 'wait'
    | 'screenshot'
    | 'price_change'
    | 'page_load';
  targetSelector: string | null;
  targetText: string | null;
  value: string | null;
  screenshotPath: string | null;
  domSnapshotPath: string | null;
  pageUrl: string;
  visiblePrice: string | null;
  timestampMs: number;
  pageChanges: PageChanges | null;
}

// What changed on the page between steps
export interface PageChanges {
  newElements: string[]; // new visible elements
  removedElements: string[]; // elements that disappeared
  changedFields: {
    selector: string;
    oldValue: string;
    newValue: string;
  }[];
  priceChanged: boolean;
  newPrice: string | null;
  oldPrice: string | null;
}

// Simplified DOM representation of a page
export interface DOMSnapshot {
  url: string;
  title: string;
  timestamp: number;
  forms: FormSnapshot[];
  priceElements: PriceElement[];
  sections: SectionSnapshot[];
  interactiveElements: InteractiveElement[];
}

export interface FormSnapshot {
  id: string | null;
  action: string | null;
  fields: FieldSnapshot[];
}

export interface FieldSnapshot {
  selector: string;
  type: string; // input, select, textarea, checkbox, radio
  name: string | null;
  id: string | null;
  label: string | null; // associated label text
  value: string;
  options?: { value: string; text: string; selected: boolean }[];
  required: boolean;
  disabled: boolean;
  visible: boolean;
  min?: string;
  max?: string;
  step?: string;
  placeholder?: string;
}

export interface PriceElement {
  selector: string;
  text: string;
  numericValue: number | null;
  currency: string | null;
}

export interface SectionSnapshot {
  selector: string;
  heading: string | null;
  visible: boolean;
  childCount: number;
}

export interface InteractiveElement {
  selector: string;
  tagName: string;
  type: string | null;
  text: string;
  visible: boolean;
  enabled: boolean;
}

// Commands from the web UI to the worker
export type WorkerCommand =
  | {
      type: 'start_recording';
      configuratorId: string;
      recordingId: string;
    }
  | { type: 'stop_recording'; recordingId: string }
  | {
      type: 'run_test';
      configuratorId: string;
      inputConfig: any;
      testResultId: string;
    }
  | { type: 'health_check'; configuratorId: string };

// Worker status updates
export interface WorkerStatus {
  workerId: string;
  status: 'idle' | 'recording' | 'testing' | 'health_check';
  currentJob: string | null;
  uptime: number;
  lastAction: string;
}
