export type Locale = "en" | "zh";

export const dictionaries = {
  en: {
    common: {
      loading: "Loading...",
      back_to_home: "Back to Home",
      back: "Back",
    },
    home: {
      title: "Looking Glass",
      select_server: "Select a server to continue",
      no_servers: "No servers configured.",
      powered_by: "Powered by BIRD Looking Glass",
    },
    detail: {
      summary: "Summary",
      route: "Route",
      traceroute: "Trace",
      protocol_summary: "Protocol Summary",
      route_query: "Route Query",
      execute: "Execute",
      run: "Run",
      table: {
        name: "Name",
        proto: "Proto",
        state: "State",
        since: "Since",
        info: "Info",
      },
      ping_placeholder: "Target IP or Hostname",
      traceroute_placeholder: "Target IP or Hostname",
      security_check: "Security Check",
      complete_captcha: "Please complete the CAPTCHA to continue.",
    },
    error: {
      title: "Error",
      page_not_found_title: "Page not found",
      page_not_found_description:
        "The page you are looking for does not exist.",
      server_not_found: "Server not found (ERR-SVR-404).",
      failed_load_config: "Failed to load config (ERR-CFG-500).",
      verification_failed: "Verification failed (ERR-AUTH-401).",
      auth_required: "Authentication required (ERR-AUTH-403-SSO).",
      rate_limit_exceeded:
        "You have exceeded the rate limit. Please try again in a moment. (ERR-RATE-429).",
      captcha_unavailable:
        "CAPTCHA service is currently unavailable. Please try again later or contact the NOC (ERR-CAP-503).",
      captcha_verification_failed: "Verification failed (ERR-CAP-403).",
    },
  },
  zh: {
    common: {
      loading: "加载中...",
      back_to_home: "返回首页",
      back: "返回",
    },
    home: {
      title: "路由之镜",
      select_server: "选择一个服务器以继续",
      no_servers: "未配置服务器。请配置 SERVERS 环境变量。",
      powered_by: "由 BIRD Looking Glass 驱动",
    },
    detail: {
      summary: "概览",
      route: "路由",
      traceroute: "追踪",
      protocol_summary: "协议概览",
      route_query: "路由查询",
      execute: "执行",
      run: "运行",
      table: {
        name: "名称",
        proto: "协议",
        state: "状态",
        since: "时间",
        info: "信息",
      },
      ping_placeholder: "目标 IP 或主机名",
      traceroute_placeholder: "目标 IP 或主机名",
      security_check: "安全检查",
      complete_captcha: "请完成验证码以继续.",
    },
    error: {
      title: "错误",
      page_not_found_title: "页面未找到",
      page_not_found_description: "你访问的页面不存在。",
      server_not_found: "未找到服务器 (ERR-SVR-404).",
      failed_load_config: "加载配置失败 (ERR-CFG-500).",
      verification_failed: "验证失败 (ERR-AUTH-401).",
      auth_required: "需要验证 (ERR-AUTH-403-SSO).",
      rate_limit_exceeded: "您已达到速率限制, 请稍后再试. (ERR-RATE-429).",
      captcha_unavailable:
        "CAPTCHA 服务当前不可用. 请稍后再试或联系网络运维中心. (ERR-CAP-503).",
      captcha_verification_failed: "验证失败 (ERR-CAP-403).",
    },
  },
};

export type Dictionary = typeof dictionaries.en;
