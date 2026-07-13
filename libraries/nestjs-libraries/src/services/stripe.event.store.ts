import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

/**
 * Idempotency for Stripe webhooks.
 *
 * Stripe delivers at-least-once: any 5xx or timeout is retried for up to three
 * days, and the same event id arrives again. Without a guard, a redelivered
 * `customer.subscription.created` grants the subscription twice and a
 * redelivered `invoice.payment_succeeded` tops up credits twice.
 *
 * `claim()` inserts the event id; the row IS the claim, so the unique primary
 * key makes the check atomic across replicas. `release()` deletes it when the
 * handler failed, so Stripe's retry can process the event instead of finding a
 * claim for work that never completed.
 */
@Injectable()
export class StripeEventStore {
  constructor(
    private _events: PrismaRepository<'stripeProcessedEvent'>
  ) {}

  /** True when this event id is new (caller should process it). */
  async claim(id: string, type: string): Promise<boolean> {
    try {
      await this._events.model.stripeProcessedEvent.create({
        data: { id, type },
      });
      return true;
    } catch (err: any) {
      // P2002 = unique violation: another delivery of this event already
      // claimed it. Anything else is a real database problem — let it surface
      // as a 500 so Stripe retries rather than silently dropping the event.
      if (err?.code === 'P2002') {
        return false;
      }
      throw err;
    }
  }

  async release(id: string): Promise<void> {
    await this._events.model.stripeProcessedEvent
      .delete({ where: { id } })
      .catch(() => {
        // Best effort: if the row is already gone the retry can proceed anyway.
      });
  }
}
