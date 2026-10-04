export const AGREEMENT_VERSION = "2026-10-v1 \u2013 Draft for Legal Review";
export const ACCEPTANCE_VERSION = "2026-10-v1";
export const ACCEPTANCE_TEXT = `By selecting the box below and choosing Accept Agreement, I confirm that I have read and understood the Root Health Introducer Agreement and the Commercial Terms shown to me, and agree to be bound by them.

Where I am accepting on behalf of an organisation, I confirm that I am authorised to enter into this Agreement on its behalf.`;
export const AGREEMENT_TEXT = `ROOT HEALTH INTRODUCER AGREEMENT
2026-10-v1 \u2013 Draft for Legal Review

This Introducer Agreement is made between David Prince trading as Root Health App of 33 Victoria Street, Maidstone, Kent, ME16 8HY ("Root") and the person or organisation identified in the Commercial Terms ("the Introducer"). Root Health App is a trading name, not a separate legal entity.

1. Appointment
Root appoints the Introducer on a non-exclusive basis for the Corporate, Personal or Both markets specified in the Commercial Terms. Neither party is an employee, agent or partner of the other. The Introducer has no authority to bind Root, offer unauthorised discounts, collect customer payments or make commitments on Root's behalf.

2. Attribution
Qualifying introductions must use the assigned referral code or link and satisfy Root's attribution and eligibility checks. Attribution must be genuine and must not replace an existing valid introduction. Self-referrals, fabricated accounts, fraudulent activity and attempts to manipulate attribution do not qualify. Root may investigate disputed attribution and explain its decision using available evidence.

3. Commercial Terms and commission
The accepted Commercial Terms identify the market, introducer type, commission percentage, one-off or recurring structure, basis, VAT position and agreement dates. Commission is calculated only on qualifying subscription revenue actually collected and retained by Root, excluding VAT charged to customers, refunds, credits and reversed or disputed payments. A one-off commission applies only to the qualifying initial payment; recurring commission applies to qualifying subsequent payments under the frozen terms applicable to the customer. Payment remains subject to the applicable clearance, invoicing and payment requirements stated in the Commercial Terms. No commission is earned on unpaid, free or fraudulent transactions.

4. VAT
The Introducer must provide accurate VAT registration details and notify Root of changes. VAT is added to commission only where applicable and supported by the required valid invoice or agreed documentation. Each party remains responsible for its own taxes. This Agreement does not itself establish a self-billing arrangement.

5. Cancellation, refunds and adjustments
Annual subscriptions run for 12 months from the customer's actual subscription start date. Where a customer cancels during a prepaid annual term, the current subscription month is treated as used; any refund begins at the next monthly subscription anniversary and covers only full unused subscription months remaining in that annual term. Introducer commission is reduced in the same proportion as the refunded revenue. Overpaid commission is first offset against future commission; any balance that cannot be offset is repayable within 30 days of written notice. Root will provide details of the adjustment. Mandatory customer rights are unaffected. These contractual provisions do not represent a promise that refund or commission adjustments are automated.

6. Conduct and marketing
The Introducer must act honestly and lawfully, clearly disclose its commercial relationship with Root where required, obtain required marketing permissions and comply with applicable advertising and marketing obligations. It must not send unlawful unsolicited communications, make misleading health or medical claims, promise diagnosis, treatment or guaranteed outcomes, or present unapproved material as Root's advice. Root's name and approved materials may be used only for authorised introductions and must not be altered misleadingly.

7. Information and confidentiality
Each party must protect confidential information and personal data, use it only for the introduction and administration of this relationship, limit access appropriately and comply with applicable data protection obligations. The Introducer must not disclose customer health information or other unnecessary personal data to Root. This Agreement does not authorise either party to process personal data on behalf of the other; any such arrangement requires separate appropriate terms. Confidentiality continues after termination, subject to lawful disclosure requirements.

8. Suspension and termination
Either party may terminate on 30 days' written notice. Root may suspend referral eligibility while investigating credible fraud, security or compliance concerns, and may terminate immediately for fraud, serious misconduct, misleading claims, misuse of data, unlawful activity or material breach. Suspension or termination does not retrospectively erase valid accrued obligations, subject to legitimate adjustments under this Agreement. No new referrals qualify after termination.

9. After termination
Recurring commission may continue only for customers validly introduced and converted before termination, under the frozen Commercial Terms applicable to those customers and subject to actual collected and retained revenue, refunds and fraud protections. Termination does not accelerate future commission or remove repayment obligations. The Introducer must stop representing itself as an authorised introducer and stop using Root's marketing materials.

10. Changes, notices and records
Material changes require a new version and fresh acceptance where required; they do not rewrite historic accepted terms or frozen customer terms. Notices must be in writing to the contact details in the Commercial Terms or a subsequently notified address. The electronically accepted text and Commercial Terms form the agreement record; both parties may retain a copy. This draft must receive legal review before operational use.

11. Governing law
This Agreement is governed by the law of England and Wales. The courts of England and Wales have jurisdiction, subject to any mandatory rights that cannot lawfully be excluded.`;

export function validateAcceptance(body) {
  if (typeof body.name !== 'string' || typeof body.capacity !== 'string') throw new Error('Name and capacity must be text.');
  const name = String(body.name || "").trim();
  const capacity = String(body.capacity || "").trim();
  if (!name || name.length > 200 || !capacity || capacity.length > 200 || /[\u0000-\u001f\u007f]/.test(name+capacity) ||
      body.agreed !== true || body.authority !== true) throw new Error("Full name, role/capacity and both confirmations are required.");
  return { name, capacity };
}
