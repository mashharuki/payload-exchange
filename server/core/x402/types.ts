export interface X402Challenge {
  amount: bigint; // smallest units
  currency: string; // 'USDC:base'
  paymentPointer?: string;
  network?: string;
}

export interface X402PaymentRequest {
  amount: bigint;
  currency: string;
  paymentPointer?: string;
  network?: string;
}

export interface X402PaymentResponse {
  success: boolean;
  transactionHash?: string;
  error?: string;
}
