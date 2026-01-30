interface TurnstileResponse {
  success: boolean;
  "error-codes"?: string[];
}

export async function verifyTurnstile(
  secretKey: string,
  token: string,
  remoteIp?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!secretKey) {
    return { success: true };
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (remoteIp) formData.append("remoteip", remoteIp);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: formData, signal: controller.signal },
    );
    clearTimeout(timeoutId);

    const result: TurnstileResponse = await response.json();
    if (!result.success) {
      return {
        success: false,
        error: result["error-codes"]?.join(", ") || "Verification failed",
      };
    }
    return { success: true };
  } catch (error) {
    const err = error as Error;
    console.error("Turnstile verification network error:", err.message);
    return {
      success: false,
      error: "turnstile.error_unavailable",
    };
  }
}
