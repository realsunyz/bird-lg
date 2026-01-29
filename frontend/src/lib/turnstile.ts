// Turnstile verification
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

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: formData },
    );

    const result: TurnstileResponse = await response.json();
    if (!result.success) {
      return {
        success: false,
        error: result["error-codes"]?.join(", ") || "Verification failed",
      };
    }
    return { success: true };
  } catch (error) {
    console.error("Turnstile verification error:", error);
    return { success: false, error: "Verification request failed" };
  }
}
