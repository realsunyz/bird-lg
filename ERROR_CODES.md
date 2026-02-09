# Error Codes

| Code                           | 含义（中文）                     | Explanation (EN)                                                          |
| ------------------------------ | -------------------------------- | ------------------------------------------------------------------------- |
| `ERR-REQ-400`                  | 请求不合法 / 参数格式错误        | Invalid request.                                                          |
| `ERR-TARGET-400-EMPTY`         | 目标不能为空                     | Target is required.                                                       |
| `ERR-TARGET-400-INVALID`       | 目标格式不合法                   | Invalid target.                                                           |
| `ERR-AUTH-401-MISSING_SIG`     | 缺少签名/时间戳头                | Missing signature headers.                                                |
| `ERR-AUTH-401-BAD_TS`          | 时间戳格式错误                   | Invalid timestamp.                                                        |
| `ERR-AUTH-401-TS_EXPIRED`      | 时间戳过期/超窗                  | Timestamp expired.                                                        |
| `ERR-AUTH-401-SIG_INVALID`     | 签名校验失败                     | Invalid signature.                                                        |
| `ERR-AUTH-401`                 | 鉴权失败（兜底）                 | Authentication failed.                                                    |
| `ERR-AUTH-403-SSO_REQUIRED`    | 需要 SSO 登录                    | SSO authentication required.                                              |
| `ERR-SERVER-404`               | 未找到服务器                     | Server not found.                                                         |
| `ERR-CMD-403`                  | 命令不允许执行                   | This command is not allowed. Please contact the NOC for more information. |
| `ERR-RATE-429`                 | 触发限流                         | Rate limit exceeded. Please try again later.                              |
| `ERR-CONFIG-500`               | 配置加载失败                     | Failed to load config.                                                    |
| `ERR-PING-500`                 | 服务器缺少 `ping` 工具           | Ping tool is not available on this server.                                |
| `ERR-TRACE-500`                | 服务器缺少 `traceroute/mtr` 工具 | Traceroute tool is not available on this server.                          |
| `ERR-TOOL-500-EXEC`            | 工具执行失败                     | Command execution failed.                                                 |
| `ERR-TOOL-504`                 | 工具执行超时                     | Command timed out.                                                        |
| `ERR-BIRD-502`                 | 查询 BIRD 失败                   | Failed to query BIRD.                                                     |
| `ERR-UPSTREAM-502-CONNECT`     | 无法连接到下游/客户端服务        | Failed to connect to upstream client.                                     |
| `ERR-UPSTREAM-502-STATUS`      | 下游/客户端返回非预期状态码      | Upstream client returned an error.                                        |
| `ERR-SSO-404`                  | 未配置 SSO（Logto）              | SSO is not configured.                                                    |
| `ERR-SSO-400-MISSING_CODE`     | 缺少 OAuth `code`                | Missing OAuth code.                                                       |
| `ERR-SSO-400-MISSING_VERIFIER` | 缺少 PKCE `code_verifier`        | Missing PKCE code verifier.                                               |
| `ERR-SSO-401-TOKEN_EXCHANGE`   | Token 交换失败                   | Token exchange failed.                                                    |
| `ERR-SSO-500-VERIFIER_GEN`     | 生成 PKCE verifier 失败          | Failed to generate PKCE verifier.                                         |
| `ERR-CAPTCHA-503`              | CAPTCHA 服务不可用               | CAPTCHA service unavailable. Please try again later or contact the NOC.   |
| `ERR-CAPTCHA-403`              | CAPTCHA 校验失败                 | CAPTCHA verification failed.                                              |
