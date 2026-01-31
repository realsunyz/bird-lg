import { useEffect } from "react";
import { useHandleSignInCallback } from "@logto/react";
import { useNavigate } from "react-router-dom";

export function AuthCallback() {
  const { isLoading, error } = useHandleSignInCallback(() => {
    // Redirect completed via navigate
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !error) {
      const redirect = sessionStorage.getItem("auth_redirect") || "/";
      sessionStorage.removeItem("auth_redirect");
      navigate(redirect, { replace: true });
    }
  }, [isLoading, error, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Processing login...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-destructive">Login failed: {error.message}</div>
      </div>
    );
  }

  return null;
}
