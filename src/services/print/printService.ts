/**
 * @fileOverview Centralized Global Print Service for YEBFA School Manager.
 * Manages document print jobs and executes canonical browser printing in one centralized location.
 * Components must NOT call window.print() directly; they must dispatch print jobs through this service.
 */

export type PrintDocumentType = 'profit-loss' | 'invoice' | 'receipt' | 'report-card' | 'general';

export interface PrintJob<T = any> {
  id: string;
  type: PrintDocumentType;
  title: string;
  data: T;
  createdAt: number;
}

type PrintJobListener = (job: PrintJob | null) => void;

class PrintService {
  private activeJob: PrintJob | null = null;
  private listeners: Set<PrintJobListener> = new Set();
  private isPrinting = false;

  /**
   * Subscribe to active print job state changes (used by GlobalPrintPortal).
   */
  public subscribe(listener: PrintJobListener): () => void {
    this.listeners.add(listener);
    listener(this.activeJob);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get currently active print job.
   */
  public getActiveJob(): PrintJob | null {
    return this.activeJob;
  }

  /**
   * Dispatches and prints a document through the centralized Global Print Architecture.
   * This is the only authorized location where canonical window.print() is invoked for documents.
   */
  public async printDocument<T = any>(options: {
    type: PrintDocumentType;
    title: string;
    data: T;
  }): Promise<void> {
    if (this.isPrinting) {
      console.warn('[PrintService] A print job is already in progress.');
      return;
    }

    if (typeof window === 'undefined') {
      console.error('[PrintService] Print service invoked in non-browser environment.');
      return;
    }

    this.isPrinting = true;
    const job: PrintJob<T> = {
      id: `print_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      type: options.type,
      title: options.title,
      data: options.data,
      createdAt: Date.now(),
    };

    try {
      this.activeJob = job;
      this.notifyListeners();

      // Allow DOM to update and images/fonts to render before executing browser print
      await new Promise((resolve) => setTimeout(resolve, 300));

      const originalTitle = document.title;
      if (options.title) {
        document.title = options.title;
      }

      // Canonical browser print execution
      window.print();

      // Restore title
      if (options.title) {
        document.title = originalTitle;
      }
    } catch (error) {
      console.error('[PrintService] Error during print execution:', error);
      throw error;
    } finally {
      // Small timeout to allow print dialog to finish before tearing down portal content
      setTimeout(() => {
        this.activeJob = null;
        this.isPrinting = false;
        this.notifyListeners();
      }, 500);
    }
  }

  /**
   * Manually clear any active job.
   */
  public clearActiveJob(): void {
    this.activeJob = null;
    this.isPrinting = false;
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.activeJob);
      } catch (err) {
        console.error('[PrintService] Error in print listener:', err);
      }
    });
  }
}

export const printService = new PrintService();
