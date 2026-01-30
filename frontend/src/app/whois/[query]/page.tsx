"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";

export default function WhoisPage() {
  const params = useParams();
  const router = useRouter();
  const query = decodeURIComponent(params.query as string);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!query) return;

    fetch("/api/whois", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else setData(json.result);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <div className="border-b bg-card">
        <div className="flex h-16 items-center px-4 max-w-7xl mx-auto w-full">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="mr-2 -ml-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-lg font-bold font-title">
            Whois Query: {query}
          </span>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        <Card>
          <CardHeader>
            <CardTitle className="font-title">Result</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="text-muted-foreground">Loading whois data...</div>
            )}
            {error && <div className="text-destructive">{error}</div>}
            {data && (
              <div className="rounded-md bg-muted p-4 overflow-x-auto">
                <pre className="text-sm font-mono whitespace-pre-wrap">
                  {data}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
