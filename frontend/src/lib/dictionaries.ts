export type Locale = "en" | "zh";

export const dictionaries = {
  en: {
    common: {
      loading: "Loading...",
      error: "Error",
      back_to_home: "Back to Home",
      back: "Back",
    },
    home: {
      app_title: "Looking Glass",
      select_server: "Select a server to continue",
      no_servers: "No servers configured. Set SERVERS environment variable.",
      powered_by: "Powered by BIRD Looking Glass",
    },
    detail: {
      server_not_found: "Server not found",
      failed_load_config: "Failed to load config",
      verification_failed: "Verification failed",
      captcha_title: "CAPTCHA Required",
      please_complete_captcha: "Please complete the CAPTCHA first.",
      summary: "Summary",
      route: "Route",
      traceroute: "Traceroute",
      protocol_summary: "Protocol Summary",
      loading_protocols: "Loading protocols...",
      route_query: "Route Query",
      execute: "Execute",
      executing: "Executing...",
      run: "Run",
      running: "Running...",
      table: {
        name: "Name",
        proto: "Proto",
        state: "State",
        since: "Since",
        info: "Info",
      },
      traceroute_placeholder: "1.1.1.1 or example.com",
      rate_limit_exceeded: "Server is busy. Please try again in a moment.",
    },
    whois: {
      title: "Whois Query",
      result: "Result",
      loading: "Loading whois data...",
      bogon_title: "Bogon Address",
      bogon_asn: "AS{asn} is a bogon ASN, which is unallocated or reserved.",
      bogon_ip: "{ip} is a bogon IP address, which is unallocated or reserved.",
    },
    turnstile: {
      error_unavailable:
        "The CAPTCHA service is currently unavailable. Please try again later or contact the NOC.",
      verification_failed: "Verification failed",
    },
  },
  zh: {
    common: {
      loading: "加载中...",
      error: "错误",
      back_to_home: "返回首页",
      back: "返回",
    },
    home: {
      app_title: "路由之镜",
      select_server: "选择一个服务器以继续",
      no_servers: "未配置服务器。请配置 SERVERS 环境变量。",
      powered_by: "由 BIRD Looking Glass 驱动",
    },
    detail: {
      server_not_found: "未找到服务器",
      failed_load_config: "加载配置失败",
      verification_failed: "验证失败",
      please_complete_captcha: "请先完成验证码",
      captcha_title: "需要验证",
      summary: "概览",
      route: "路由",
      traceroute: "路由追踪",
      protocol_summary: "协议概览",
      loading_protocols: "正在加载协议...",
      route_query: "路由查询",
      execute: "执行",
      executing: "执行中...",
      run: "运行",
      running: "运行中...",
      table: {
        name: "名称",
        proto: "协议",
        state: "状态",
        since: "时间",
        info: "信息",
      },
      traceroute_placeholder: "1.1.1.1 或 example.com",
      rate_limit_exceeded: "服务器繁忙, 请稍后再试.",
    },
    whois: {
      title: "Whois 查询",
      result: "结果",
      loading: "正在加载 Whois 数据...",
      bogon_title: "Bogon 地址",
      bogon_asn: "AS{asn} 是未分配或被保留的 Bogon ASN.",
      bogon_ip: "{ip} 是未分配或被保留的 Bogon IP.",
    },
    turnstile: {
      error_unavailable:
        "CAPTCHA 服务当前不可用. 请稍后再试或联系网络运维中心.",
      verification_failed: "验证失败",
    },
  },
};

export type Dictionary = typeof dictionaries.en;
