export interface Resource {
  id: string;
  url: string;
  description?: string;
  metadata?: {
    paymentAnalytics?: {
      totalTransactions?: number;
      totalUniqueUsers?: number;
      averageDailyTransactions?: number;
      transactionsMonth?: number;
    };
    confidence?: {
      overallScore?: number;
    };
    outputSchema?: {
      input?: {
        method?: string;
        headerFields?: Record<string, any>;
        bodyFields?: Record<string, any>;
      };
    };
  };
  accepts?: Array<{
    maxAmountRequired?: string;
    network?: string;
    description?: string;
  }>;
}
