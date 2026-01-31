import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AlertCircleIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslation } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function WhoisPage() {
  const { query } = useParams<{ query: string }>();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState("");
  const [error, setError] = useState("");
  const [bogon, setBogon] = useState<{
    isBogon: boolean;
    reasonKey?: string;
    params?: Record<string, string>;
  }>({ isBogon: false });

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
        else if (json.bogon)
          setBogon({
            isBogon: true,
            reasonKey: json.reasonKey,
            params: json.params,
          });
        else if (json.result) {
          setData(json.result);
        }
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [query]);

  const getBogonMessage = () => {
    if (!bogon.reasonKey) return "Bogon address";
    const key = bogon.reasonKey as keyof typeof t.whois;
    let message = t.whois[key] || "Bogon address";
    if (bogon.params) {
      Object.entries(bogon.params).forEach(([k, v]) => {
        message = message.replace(`{${k}}`, String(v));
      });
    }
    return message;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <div className="border-b bg-card">
        <div className="flex h-16 items-center px-4 max-w-7xl mx-auto w-full justify-between">
          <div className="flex items-center">
            <span className="text-lg font-normal font-title">
              {t.whois.title}: {query}
            </span>
          </div>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        <Card>
          <CardHeader>
            <CardTitle className="font-title">{t.whois.result}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="text-muted-foreground">{t.whois.loading}</div>
            )}
            {error && <div className="text-destructive">{error}</div>}
            {bogon.isBogon && (
              <Alert variant="destructive">
                <AlertCircleIcon className="h-4 w-4" />
                <AlertTitle className="mb-1">{t.whois.bogon_title}</AlertTitle>
                <AlertDescription>{getBogonMessage()}</AlertDescription>
              </Alert>
            )}
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
