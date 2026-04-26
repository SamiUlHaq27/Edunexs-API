import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { getSecretValue } from 'src/config/secret.config';

@Injectable()
export class StripeService {
  private logger = new Logger(this.constructor.name);
  private stripe: InstanceType<typeof Stripe> | null;

  constructor() {
    const stripeKey = getSecretValue('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      this.logger.warn('STRIPE_SECRET_KEY not configured');
      this.stripe = null;
    } else {
      this.stripe = new Stripe(stripeKey);
    }
  }

  async createPaymentIntent(
    amount: number,
    currency: string = 'pkr',
    metadata?: Record<string, string>,
  ) {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata: metadata || {},
      });

      this.logger.log(`Payment intent created: ${paymentIntent.id}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error(
        `Failed to create payment intent: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw error;
    }
  }

  async confirmPaymentIntent(clientSecret: string) {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      // Extract intent ID from client secret
      const intentId = clientSecret.split('_secret_')[0];
      const paymentIntent = await this.stripe.paymentIntents.retrieve(intentId);

      return paymentIntent;
    } catch (error) {
      this.logger.error(
        `Failed to confirm payment: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw error;
    }
  }

  async refundPayment(paymentIntentId: string) {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
      });

      this.logger.log(`Refund created: ${refund.id}`);
      return refund;
    } catch (error) {
      this.logger.error(
        `Failed to refund payment: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw error;
    }
  }

  isConfigured(): boolean {
    return !!this.stripe;
  }
}
