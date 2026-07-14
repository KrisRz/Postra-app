import {
  BadRequestException,
  Controller,
  HttpException,
  Logger,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { StripeService } from '@gitroom/nestjs-libraries/services/stripe.service';
import { StripeEventStore } from '@gitroom/nestjs-libraries/services/stripe.event.store';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Stripe')
@Controller('/stripe')
export class StripeController {
  constructor(
    private readonly _stripeService: StripeService,
    private readonly _eventStore: StripeEventStore
  ) {}

  @Post('/')
  async stripe(@Req() req: RawBodyRequest<Request>) {
    // The endpoint is public, so anything that reaches it without a valid
    // signature is not Stripe — a scanner, a stray request, a misconfigured
    // endpoint. That is a bad request (400), not a server error: a 500 both
    // reports a Sentry event (a free 5k/month quota anyone could exhaust from
    // the outside) and tells a real Stripe delivery to retry something that can
    // never succeed.
    let event: ReturnType<StripeService['validateRequest']>;
    try {
      event = this._stripeService.validateRequest(
        req.rawBody,
        // @ts-ignore
        req.headers['stripe-signature'],
        process.env.STRIPE_SIGNING_KEY
      );
    } catch (e) {
      throw new BadRequestException('Invalid Stripe signature');
    }

    // Maybe it comes from another stripe webhook
    if (
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      event?.data?.object?.metadata?.service !== 'gitroom' &&
      event.type !== 'invoice.payment_succeeded' &&
      event.type !== 'invoice.payment_failed' &&
      event.type !== 'invoice.payment_action_required'
    ) {
      return { ok: true };
    }

    const handle = () => {
      switch (event.type) {
        case 'invoice.payment_succeeded':
          return this._stripeService.paymentSucceeded(event);
        case 'customer.subscription.created':
          return this._stripeService.createSubscription(event);
        case 'customer.subscription.updated':
          return this._stripeService.updateSubscription(event);
        case 'customer.subscription.deleted':
          return this._stripeService.deleteSubscription(event);
        case 'invoice.payment_failed':
          return this._stripeService.paymentFailed(event);
        case 'invoice.payment_action_required':
          return this._stripeService.paymentActionRequired(event);
        default:
          return undefined;
      }
    };

    // Claim the event id before doing any work. Stripe retries a delivery for
    // up to 3 days on any 5xx or timeout, and a second run of these handlers
    // would grant the subscription or the credits twice.
    if (!(await this._eventStore.claim(event.id, event.type))) {
      return { ok: true, duplicate: true };
    }

    try {
      const result = await handle();
      return result ?? { ok: true };
    } catch (e) {
      // Release the claim so Stripe's retry actually reprocesses the event
      // instead of finding a claim for work that never completed. Answering 500
      // is what asks Stripe to retry.
      await this._eventStore.release(event.id);
      Logger.error(
        `Stripe webhook ${event.type} (${event.id}) failed`,
        e instanceof Error ? e.stack : String(e)
      );
      throw new HttpException('Webhook handler failed', 500);
    }
  }
}
