import { Button } from "@/shared/ui/button";
import { ResponsiveDialog } from "@/shared/ui/responsive-dialog";
import { useTranslation } from "@/shared/i18n/provider";
import { cn } from "@/shared/lib/utils";

const aupContent = {
  en: {
    title: "Acceptable Use Policy",
    intro:
      "Use of Sunyz Network Looking Glass is limited to legitimate network diagnostics and testing, including connectivity checks, route analysis, and latency measurement.",
    prohibitedIntro:
      "You agree not to use the service, and not to allow others to use the service:",
    prohibitedItems: [
      "to launch or assist any form of denial of service activity, including DoS, DDoS, or traffic amplification attacks;",
      "to harass, abuse, or interfere with any third-party server, service, or network;",
      "to bypass or attempt to bypass Cloudflare Turnstile or any other access-control or anti-abuse mechanism used by the service;",
      "to use automated scripts, scrapers, bots, or similar tooling to invoke the API or web interface in a manner that is excessive, abusive, or disruptive;",
      "to conduct port scanning, vulnerability probing, intelligence gathering, or other activities that violate applicable laws, regulations, or the rights of others;",
      "to use the service for any purpose other than lawful network diagnostics and testing.",
    ],
    privacy:
      "This website uses Cloudflare Turnstile to distinguish human users from automated bots and to protect the service from abuse. To maintain service quality and investigate malicious behavior, we may temporarily log visitors' IP addresses, request timestamps, and queried destination addresses. This data is used only for security auditing and abuse prevention.",
    consequences:
      "Violation of this Acceptable Use Policy may result in suspension or termination of access to the service.",
  },
  zh: {
    title: "可接受使用政策",
    intro:
      "Sunyz Network Looking Glass 仅可用于合法的网络诊断和测试，包括连通性检查、路由分析和延迟测量。",
    prohibitedIntro: "您同意不会使用本服务，也不会允许他人使用本服务：",
    prohibitedItems: [
      "发起或协助任何形式的拒绝服务活动，包括 DoS、DDoS 或流量放大攻击；",
      "对任何第三方服务器、服务或网络进行骚扰、滥用或干扰；",
      "绕过或尝试绕过 Cloudflare Turnstile 或本服务使用的任何访问控制、反滥用机制；",
      "使用自动化脚本、爬虫、机器人或类似工具，以过量、滥用或干扰性的方式调用 API 或网页界面；",
      "进行端口扫描、漏洞探测、信息收集，或从事其他违反适用法律法规或侵害他人权利的活动；",
      "将本服务用于合法网络诊断和测试以外的其他用途。",
    ],
    privacy:
      "本网站使用 Cloudflare Turnstile 区分人类用户与自动化机器人，以保护服务免受滥用。为了维护服务质量和排查恶意行为，我们可能会临时记录访问者的 IP 地址、请求时间戳以及查询的目标地址。这些数据仅用于安全审计和防滥用。",
    consequences: "违反本《可接受使用政策》可能导致服务访问被暂停或终止。",
  },
} as const;

interface AUPDialogProps {
  mobile?: boolean;
}

export function AUPDialog({ mobile = false }: AUPDialogProps) {
  const { t, locale } = useTranslation();
  const content = aupContent[locale];

  return (
    <ResponsiveDialog
      title={content.title}
      content={
        <div className="mx-auto max-w-[42rem] space-y-3 pr-2 text-sm leading-5.5">
          <p className="text-sm leading-5.5 text-foreground">{content.intro}</p>
          <section className="space-y-1.5">
            <p className="text-sm leading-5.5 text-foreground">
              {content.prohibitedIntro}
            </p>
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-5.5 text-foreground">
              {content.prohibitedItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <p className="text-sm leading-5.5 text-foreground">{content.privacy}</p>
          <p className="text-sm leading-5.5 text-foreground">{content.consequences}</p>
        </div>
      }
    >
      <Button
        variant="link"
        size="sm"
        className={cn(
          "h-auto p-0 font-normal text-muted-foreground hover:text-foreground",
          mobile ? "text-xs" : "text-sm",
        )}
      >
        {mobile ? t.footer.aup_short : t.footer.aup_full}
      </Button>
    </ResponsiveDialog>
  );
}
