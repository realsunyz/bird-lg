import {
  Card,
  CardContent,
  CardHeader,
} from "@/shared/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TabsHighlight,
  TabsHighlightItem,
} from "@/shared/ui/animate-ui/primitives/radix/tabs";
import { useTranslation } from "@/shared/i18n/provider";
import { PingTab } from "@/features/ping/ui/ping-tab";
import { TraceTab } from "@/features/trace/ui/trace-tab";
import { RouteTab } from "@/features/bird-route/ui/route-tab";

const tabsListClass =
  "flex w-full min-w-max items-stretch justify-start gap-4 md:gap-8 bg-transparent p-0 px-4 md:px-6";
const tabsTriggerClass =
  "rounded-none px-0 py-2 text-sm font-medium text-muted-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none";

interface DetailTabsCardProps {
  activeTab: string;
  enableTabSwitchAnimation: boolean;
  isSSO: boolean;
  serverId: string;
  canRunWithoutCaptcha: boolean;
  loading: boolean;
  result: unknown;
  error: string;
  lastCommand: string;
  routePreset: string;
  setRoutePreset: (value: string) => void;
  routeInput: string;
  setRouteInput: (value: string) => void;
  onValueChange: (value: string) => void;
  onUnauthorized: (retry: () => void) => void;
  onProtocolSelect: (name: string) => void;
  runBirdQuery: (command: string) => Promise<void>;
}

export function DetailTabsCard({
  activeTab,
  enableTabSwitchAnimation,
  isSSO,
  serverId,
  canRunWithoutCaptcha,
  loading,
  result,
  error,
  lastCommand,
  routePreset,
  setRoutePreset,
  routeInput,
  setRouteInput,
  onValueChange,
  onUnauthorized,
  onProtocolSelect,
  runBirdQuery,
}: DetailTabsCardProps) {
  const { t } = useTranslation();

  return (
    <Tabs value={activeTab} onValueChange={onValueChange} className="w-full gap-0">
      <Card>
        <CardHeader className="p-0 border-b">
          <TabsHighlight
            forceUpdateBounds
            mode="parent"
            containerClassName="w-full overflow-x-auto"
            className="rounded-none bg-transparent border-b-2 border-foreground"
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
          >
            <TabsList className={tabsListClass}>
              <TabsHighlightItem value="ping" asChild>
                <TabsTrigger value="ping" className={tabsTriggerClass}>
                  {t.detail.ping}
                </TabsTrigger>
              </TabsHighlightItem>
              <TabsHighlightItem value="trace" asChild>
                <TabsTrigger value="trace" className={tabsTriggerClass}>
                  {t.detail.trace}
                </TabsTrigger>
              </TabsHighlightItem>
              {isSSO && (
                <TabsHighlightItem value="route" asChild>
                  <TabsTrigger value="route" className={tabsTriggerClass}>
                    {t.detail.route}
                  </TabsTrigger>
                </TabsHighlightItem>
              )}
            </TabsList>
          </TabsHighlight>
        </CardHeader>
        <CardContent className="pt-6">
          <TabsContent
            value="ping"
            forceMount
            className="mt-0"
            initial={
              enableTabSwitchAnimation
                ? { opacity: 0, filter: "blur(4px)" }
                : false
            }
          >
            <PingTab
              activeServer={serverId}
              isSSO={isSSO}
              canRunWithoutCaptcha={canRunWithoutCaptcha}
              onUnauthorized={onUnauthorized}
            />
          </TabsContent>
          <TabsContent
            value="trace"
            forceMount
            className="mt-0"
            initial={
              enableTabSwitchAnimation
                ? { opacity: 0, filter: "blur(4px)" }
                : false
            }
          >
            <TraceTab
              activeServer={serverId}
              canRunWithoutCaptcha={canRunWithoutCaptcha}
              onUnauthorized={onUnauthorized}
            />
          </TabsContent>
          {isSSO && (
            <TabsContent
              value="route"
              forceMount
              className="mt-0"
              initial={
                enableTabSwitchAnimation
                  ? { opacity: 0, filter: "blur(4px)" }
                  : false
              }
            >
              <RouteTab
                runBirdQuery={runBirdQuery}
                loading={loading}
                result={result}
                error={error}
                lastCommand={lastCommand}
                preset={routePreset}
                setPreset={setRoutePreset}
                input={routeInput}
                setInput={setRouteInput}
                onProtocolSelect={onProtocolSelect}
              />
            </TabsContent>
          )}
        </CardContent>
      </Card>
    </Tabs>
  );
}
