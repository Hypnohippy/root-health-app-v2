const id = value => typeof value === "string" ? value : value?.id;

// invoice.paid alone can include out-of-band/credit payments. Require matching
// succeeded Stripe PaymentIntents and only count their invoice allocation.
export async function collectedPersonalAmount(stripe, invoice) {
  if (invoice.status !== "paid" || invoice.paid_out_of_band || !(invoice.amount_paid > 0)) return 0;
  if (invoice.currency !== "gbp") throw Error("Personal referral accounting requires GBP.");
  const payments = invoice.payment_intent
    ? [{ amount_paid: invoice.amount_paid, payment: { type: "payment_intent", payment_intent: invoice.payment_intent } }]
    : await stripe.invoicePayments.list({ invoice: invoice.id, status: "paid", limit: 100 }).autoPagingToArray({ limit: 1000 });
  let total = 0;
  const seen = new Set();
  for (const entry of payments) {
    const paymentId = id(entry.payment?.payment_intent);
    if (entry.payment?.type !== "payment_intent" || !paymentId || seen.has(paymentId)) continue;
    seen.add(paymentId);
    const payment = await stripe.paymentIntents.retrieve(paymentId);
    if (payment.status !== "succeeded" || id(payment.customer) !== id(invoice.customer) ||
        payment.currency !== invoice.currency) throw Error("Unverified Personal invoice payment.");
    if (!Number.isSafeInteger(entry.amount_paid) || entry.amount_paid < 0 ||
        entry.amount_paid > payment.amount_received) throw Error("Invalid invoice payment allocation.");
    total += entry.amount_paid;
  }
  if (total > invoice.amount_paid) throw Error("Invoice payment exceeds paid amount.");
  return total;
}

export async function recordPersonalReferralInvoice({ stripe, supabase, subscription, invoice }) {
  const metadata = subscription.metadata || {};
  if (metadata.root_product !== "personal" || !metadata.personal_attribution_id) return;
  const subscriptionId = id(invoice.subscription) || id(invoice.parent?.subscription_details?.subscription);
  if (subscriptionId !== subscription.id || id(invoice.customer) !== id(subscription.customer) || !metadata.user_id) {
    throw Error("Personal invoice identity mismatch.");
  }
  // Process older paid invoices first so out-of-order delivery cannot give a
  // one-off introducer the renewal amount instead of the first collected payment.
  const invoices = await stripe.invoices.list({
    subscription: subscription.id, status: "paid", limit: 100,
  }).autoPagingToArray({ limit: 1000 });
  if (!invoices.some(item => item.id === invoice.id)) throw Error("Paid invoice is not yet available.");
  invoices.sort((a, b) => a.status_transitions.paid_at - b.status_transitions.paid_at || a.created - b.created);
  for (const paid of invoices) {
    if (id(paid.customer) !== id(subscription.customer)) throw Error("Personal invoice customer mismatch.");
    const amount = await collectedPersonalAmount(stripe, paid);
    if (!amount) continue;
    const paidAt = paid.status_transitions?.paid_at;
    if (!Number.isSafeInteger(paidAt)) throw Error("Missing Stripe payment timestamp.");
    const { error } = await supabase.rpc("record_personal_referral_payment", {
      p_attribution_id: metadata.personal_attribution_id, p_user_id: metadata.user_id,
      p_invoice_id: paid.id, p_subscription_id: subscription.id,
      p_customer_id: id(subscription.customer), p_amount_minor: amount,
      p_currency: paid.currency, p_paid_at: new Date(paidAt * 1000).toISOString(),
    });
    if (error) throw error;
  }
}
