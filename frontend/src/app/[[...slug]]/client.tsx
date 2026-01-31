"use client";

import { Suspense, lazy, useEffect, useState } from "react";

const HomePage = lazy(() => import("@/components/pages/home"));
const DetailPage = lazy(() => import("@/components/pages/detail"));
const CaptchaPage = lazy(() => import("@/components/pages/captcha"));
const WhoisPage = lazy(() => import("@/components/pages/whois"));

function Loading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
        <div
          className="w-2 h-2 rounded-full bg-current animate-bounce"
          style={{ animationDelay: "0s" }}
        />
        <div
          className="w-2 h-2 rounded-full bg-current animate-bounce"
          style={{ animationDelay: "0.2s" }}
        />
        <div
          className="w-2 h-2 rounded-full bg-current animate-bounce"
          style={{ animationDelay: "0.4s" }}
        />
      </div>
    </div>
  );
}

export default function ClientRouter() {
  const [slug, setSlug] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Parse pathname on client side
    const path = window.location.pathname;
    const parts = path.split("/").filter(Boolean);
    setSlug(parts);
    setIsClient(true);
  }, []);

  // Show loading until client-side hydration completes
  if (!isClient) {
    return <Loading />;
  }

  if (slug.length === 0) {
    return (
      <Suspense fallback={<Loading />}>
        <HomePage />
      </Suspense>
    );
  }

  if (slug[0] === "detail" && slug[1]) {
    return (
      <Suspense fallback={<Loading />}>
        <DetailPage serverId={slug[1]} />
      </Suspense>
    );
  }

  if (slug[0] === "captcha") {
    return (
      <Suspense fallback={<Loading />}>
        <CaptchaPage />
      </Suspense>
    );
  }

  if (slug[0] === "whois" && slug[1]) {
    return (
      <Suspense fallback={<Loading />}>
        <WhoisPage query={decodeURIComponent(slug[1])} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-muted-foreground">Page not found</p>
      </div>
    </div>
  );
}
