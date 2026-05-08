const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;

export function PaymentTestModeBanner() {
  if (!clientToken?.startsWith("pk_test_")) return null;

  return (
    <div className="w-full bg-orange-500/20 border-b border-orange-500/40 px-4 py-2 text-center text-xs text-orange-300 uppercase tracking-widest"
      style={{ fontFamily: "'Orbitron', sans-serif" }}>
      Test mode — use card 4242 4242 4242 4242 for sandbox payments.{" "}
      <a
        href="https://docs.lovable.dev/features/payments#test-and-live-environments"
        target="_blank"
        rel="noopener noreferrer"
        className="underline font-medium"
      >
        Read more
      </a>
    </div>
  );
}
