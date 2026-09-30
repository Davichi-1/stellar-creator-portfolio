'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { paymentFlowSchema, validatePaymentFlow, type PaymentFlowData } from '@/lib/payment-validation';

/**
 * SEP-24 payment form: collects and validates amount/asset/account details
 * against `paymentFlowSchema` via React Hook Form, then re-validates with
 * `validatePaymentFlow` on submit.
 *
 * Submission posts to `/api/payments/sep24` (Issue #1393). It previously only
 * `console.log`ed the payload behind a `// TODO: Call API endpoint`, so the
 * button reported success without anything having happened — the worst possible
 * outcome for a form that takes a recipient and an amount.
 *
 * The anchor handshake itself lives server-side: the interactive endpoints need
 * a SEP-10 JWT, and minting one in the browser would put the signing key there.
 * See `lib/stellar/sep24.ts` for the protocol client the route uses.
 */
export interface Sep24FlowProps {
  /** Where the validated payload is posted. Overridable for tests. */
  endpoint?: string;
  /** Called with the anchor's interactive URL once the server returns one. */
  onInteractiveUrl?: (url: string) => void;
  onSuccess?: (result: { id: string; url: string }) => void;
}

export const Sep24Flow: React.FC<Sep24FlowProps> = ({
  endpoint = '/api/payments/sep24',
  onInteractiveUrl,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<PaymentFlowData>({
    resolver: zodResolver(paymentFlowSchema),
    mode: 'onChange',
  });

  const amount = watch('amount');

  const onSubmit = async (data: PaymentFlowData) => {
    // Validate before submission
    const validation = validatePaymentFlow(data);
    if (!validation.valid) {
      setSubmitError(validation.errors?.join(', ') ?? 'Validation failed');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        // Surface the server's reason. "Asset not supported by this anchor" and
        // "KYC required" need different things from the user, and a generic
        // failure message tells them neither.
        let detail = `Payment could not be started (${response.status})`;
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload.error) detail = payload.error;
        } catch {
          // Non-JSON error body — keep the status-code message.
        }
        setSubmitError(detail);
        return;
      }

      const result = (await response.json()) as { id?: string; url?: string };
      if (!result.url || !result.id) {
        setSubmitError('The anchor did not return an interactive URL.');
        return;
      }

      onInteractiveUrl?.(result.url);
      onSuccess?.({ id: result.id, url: result.url });
    } catch {
      // A network failure here means we do not know whether the anchor created
      // the transaction, so the message deliberately does not claim it failed.
      setSubmitError('Could not reach the payment service. Check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="recipientAddress">Recipient Stellar Address</Label>
        <Input
          id="recipientAddress"
          placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
          {...register('recipientAddress')}
          aria-invalid={!!errors.recipientAddress}
        />
        {errors.recipientAddress && (
          <p className="text-sm text-destructive">{errors.recipientAddress.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount (XLM)</Label>
        <Input
          id="amount"
          type="number"
          step="0.0001"
          placeholder="0.0000"
          {...register('amount', { valueAsNumber: true })}
          aria-invalid={!!errors.amount}
        />
        {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
        {amount && <p className="text-xs text-muted-foreground">Amount: {amount} XLM</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          placeholder="Payment description"
          {...register('description')}
          aria-invalid={!!errors.description}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="memo">Memo (Optional)</Label>
        <Input
          id="memo"
          placeholder="Transaction memo"
          maxLength={28}
          {...register('memo')}
          aria-invalid={!!errors.memo}
        />
        {errors.memo && <p className="text-sm text-destructive">{errors.memo.message}</p>}
      </div>

      {submitError && (
        <p role="alert" className="text-sm text-destructive">
          {submitError}
        </p>
      )}

      <Button type="submit" disabled={!isValid || isSubmitting} className="w-full">
        {isSubmitting ? 'Processing...' : 'Continue to Payment'}
      </Button>
    </form>
  );
};
