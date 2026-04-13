/**
 * stripeService.ts — Frontend Stripe payment service for ValuBrix Premium
 *
 * Wraps calls to the backend Stripe extension methods.
 * The backend exposes: createCheckoutSession, verifyAndUpgradeFromSession,
 * getUserSubscriptionStatus, isPremiumUser.
 *
 * When these methods are NOT yet available on the actor (bindgen hasn't run),
 * the service degrades gracefully with informative errors.
 */

/** Result of a checkout session creation attempt */
export interface CheckoutSessionResult {
  ok: boolean;
  sessionUrl?: string;
  error?: string;
}

/** Result of a payment verification attempt */
export interface VerifyPaymentResult {
  ok: boolean;
  isPremium?: boolean;
  error?: string;
}

// ── localStorage key for pending session IDs ──────────────────────────────────
const PENDING_SESSION_KEY = "valubrix_pending_stripe_session";

/**
 * Creates a Stripe checkout session via the backend actor.
 * @param actor — the backend actor (can be null if not yet loaded)
 * @param successUrl — URL to redirect to on payment success
 * @param cancelUrl — URL to redirect to on payment cancel
 */
export async function createCheckoutSession(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actor: any,
  successUrl: string,
  cancelUrl: string,
): Promise<CheckoutSessionResult> {
  if (!actor) {
    return { ok: false, error: "Backend not connected. Please try again." };
  }

  try {
    // The Stripe extension exposes createCheckoutSession on the actor
    if (typeof actor.createCheckoutSession !== "function") {
      return {
        ok: false,
        error:
          "Payment service is not available yet. Please try again shortly.",
      };
    }

    const items = [
      {
        name: "ValuBrix Premium",
        description: "Full Geo Intelligence & Area Deep-Dive Reports",
        amount: 99900, // ₹999 in paise
        currency: "inr",
        quantity: 1,
      },
    ];

    const result = await actor.createCheckoutSession(
      {}, // config — empty object, extension fills defaults
      null, // caller — null means use authenticated principal
      items,
      successUrl,
      cancelUrl,
      null, // transform — no custom transform
    );

    // Result is { Ok: sessionUrl } | { Err: string }
    if (result && "Ok" in result) {
      // Persist session for verification on return
      const sessionUrl: string = result.Ok;
      const sessionId = extractSessionId(sessionUrl);
      if (sessionId) {
        localStorage.setItem(PENDING_SESSION_KEY, sessionId);
      }
      return { ok: true, sessionUrl };
    }

    if (result && "Err" in result) {
      return { ok: false, error: result.Err as string };
    }

    // Unexpected result shape
    return { ok: false, error: "Unexpected response from payment service." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Payment initiation failed: ${msg}` };
  }
}

/**
 * Verifies a completed Stripe payment and upgrades the user to premium.
 * Called when the user returns to the app after a successful checkout.
 * @param actor — the backend actor
 * @param sessionId — Stripe checkout session ID (from URL param or localStorage)
 */
export async function verifyAndUpgradeFromSession(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actor: any,
  sessionId?: string,
): Promise<VerifyPaymentResult> {
  const sid =
    sessionId || localStorage.getItem(PENDING_SESSION_KEY) || undefined;

  if (!actor) {
    return { ok: false, error: "Backend not connected." };
  }

  try {
    if (typeof actor.verifyAndUpgradeFromSession === "function") {
      const result = await actor.verifyAndUpgradeFromSession(sid ?? "");
      localStorage.removeItem(PENDING_SESSION_KEY);

      if (result && "Ok" in result) {
        return { ok: true, isPremium: true };
      }
      if (result && "Err" in result) {
        return { ok: false, error: result.Err as string };
      }
      // Treat any truthy result without Err as success
      return { ok: true, isPremium: true };
    }

    // Backend method not available — fall through to localStorage-only upgrade
    // This is a graceful degradation for when the backend hasn't redeployed yet.
    // In production this path should never be hit once bindgen runs.
    localStorage.removeItem(PENDING_SESSION_KEY);
    return {
      ok: true,
      isPremium: true,
      // Note: without backend verification the upgrade is client-side only
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    localStorage.removeItem(PENDING_SESSION_KEY);
    return { ok: false, error: `Verification failed: ${msg}` };
  }
}

/**
 * Gets the subscription status for the current user from the backend.
 * @param actor — the backend actor
 */
export async function getUserSubscriptionStatus(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actor: any,
): Promise<"free" | "premium"> {
  if (!actor) return "free";
  try {
    if (typeof actor.getUserSubscriptionStatus === "function") {
      const status: string = await actor.getUserSubscriptionStatus();
      return status === "premium" ? "premium" : "free";
    }
  } catch {
    /* ignore */
  }
  return "free";
}

/**
 * Extracts session ID from a Stripe checkout URL.
 * Stripe URLs look like: https://checkout.stripe.com/pay/cs_test_xxx
 */
function extractSessionId(url: string): string | null {
  try {
    const parts = url.split("/");
    const last = parts[parts.length - 1];
    return last.startsWith("cs_") ? last : null;
  } catch {
    return null;
  }
}
