import Link from "next/link";

const faqs = [
  {
    question: "How does VendorCredit Radar help recover money?",
    answer:
      "It tracks every return/RMA as a case, applies vendor-specific claim checklists, and keeps evidence and due dates in one workflow so credits are submitted and followed through."
  },
  {
    question: "Can multiple stores use one account?",
    answer:
      "Each organization is isolated and supports multiple users. For multi-store operators, create one organization per legal/store entity to keep vendor claims and reporting separate."
  },
  {
    question: "What import formats are supported?",
    answer:
      "CSV imports with a mapping step. You can map POS export columns to case fields and apply dedupe rules before creating records."
  },
  {
    question: "How is billing handled?",
    answer:
      "Stripe Checkout handles sign-up and trials. Customers can self-manage plan changes and cancellation in Stripe Billing Portal."
  }
];

export default function FaqPage() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-14">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold">
          VendorCredit Radar
        </Link>
        <Link className="text-sm font-medium text-primary" href="/pricing">
          View pricing
        </Link>
      </header>

      <h1 className="mt-12 text-4xl font-bold">Frequently asked questions</h1>
      <div className="mt-8 space-y-6">
        {faqs.map((item) => (
          <article key={item.question} className="rounded-xl border bg-white p-6">
            <h2 className="text-lg font-semibold">{item.question}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{item.answer}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
