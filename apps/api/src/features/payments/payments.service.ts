import { Injectable, Logger } from '@nestjs/common';

export enum PaymentStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
}

export interface PaymentResult {
  status: PaymentStatus;
  transactionId: string;
  errorMessage?: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  /**
   * Simulate payment processing
   * - 95% success rate
   * - 5% failure rate
   */
  async processPayment(
    amount: number,
    bookingId: number,
    userId: number,
  ): Promise<PaymentResult> {
    this.logger.debug(
      `Processing payment: amount=${amount}, bookingId=${bookingId}, userId=${userId}`,
    );

    // Generate random outcome - 5% failure rate
    const random = Math.random();

    if (random < 0.05) {
      this.logger.warn(`Payment failed for booking ${bookingId}`);
      return {
        status: PaymentStatus.FAILED,
        transactionId: this.generateTransactionId(),
        errorMessage: 'Payment declined by card issuer',
      };
    }

    // Success
    const transactionId = this.generateTransactionId();
    this.logger.log(
      `Payment successful for booking ${bookingId}: ${transactionId}`,
    );
    return {
      status: PaymentStatus.SUCCESS,
      transactionId,
    };
  }

  /**
   * Generate a fake transaction ID
   */
  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}
