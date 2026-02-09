# Error Code 标准（统一报错格式）

## 目标

从现在起，所有对外报错（API 返回中的 `error` 字段、以及前端直接展示的错误文案）统一为：

```
<解释> (<Code>).
```

示例：

- `This command is not allowed. Please contact the NOC for more information. (ERR-CMD-403).`

说明：

- **解释**：给用户看的简洁说明（不要包含敏感信息/内部实现细节）。
- **Code**：稳定、可检索的错误码，用于排障与统计。

## Code 命名规则

统一使用：

```
ERR-<DOMAIN>-<HTTP_STATUS>[-<DETAIL>]
```

- `<DOMAIN>`：大写短域名（如 `AUTH` / `CMD` / `RATE` / `SSO` / `CAPTCHA` / `UPSTREAM`）。
- `<HTTP_STATUS>`：三位数字（如 `400` / `401` / `403` / `404` / `429` / `500` / `502` / `503` / `504`）。
- `[-<DETAIL>]`：可选细分（如 `MISSING_SIG` / `INVALID` / `EMPTY`）。

## 错误码定义

| Code | 含义（中文） | Explanation (EN) |
|---|---|---|
| `ERR-REQ-400` | 请求不合法 / 参数格式错误 | Invalid request. |
| `ERR-TARGET-400-EMPTY` | 目标不能为空 | Target is required. |
| `ERR-TARGET-400-INVALID` | 目标格式不合法 | Invalid target. |
| `ERR-AUTH-401-MISSING_SIG` | 缺少签名/时间戳头 | Missing signature headers. |
| `ERR-AUTH-401-BAD_TS` | 时间戳格式错误 | Invalid timestamp. |
| `ERR-AUTH-401-TS_EXPIRED` | 时间戳过期/超窗 | Timestamp expired. |
| `ERR-AUTH-401-SIG_INVALID` | 签名校验失败 | Invalid signature. |
| `ERR-AUTH-401` | 鉴权失败（兜底） | Authentication failed. |
| `ERR-AUTH-403-SSO_REQUIRED` | 需要 SSO 登录 | SSO authentication required. |
| `ERR-SERVER-404` | 未找到服务器 | Server not found. |
| `ERR-CMD-403` | 命令不允许执行 | This command is not allowed. Please contact the NOC for more information. |
| `ERR-RATE-429` | 触发限流 | Rate limit exceeded. Please try again later. |
| `ERR-CONFIG-500` | 配置加载失败 | Failed to load config. |
| `ERR-PING-500` | 服务器缺少 `ping` 工具 | Ping tool is not available on this server. |
| `ERR-TRACE-500` | 服务器缺少 `traceroute/mtr` 工具 | Traceroute tool is not available on this server. |
| `ERR-TOOL-500-EXEC` | 工具执行失败 | Command execution failed. |
| `ERR-TOOL-504` | 工具执行超时 | Command timed out. |
| `ERR-BIRD-502` | 查询 BIRD 失败 | Failed to query BIRD. |
| `ERR-UPSTREAM-502-CONNECT` | 无法连接到下游/客户端服务 | Failed to connect to upstream client. |
| `ERR-UPSTREAM-502-STATUS` | 下游/客户端返回非预期状态码 | Upstream client returned an error. |
| `ERR-SSO-404` | 未配置 SSO（Logto） | SSO is not configured. |
| `ERR-SSO-400-MISSING_CODE` | 缺少 OAuth `code` | Missing OAuth code. |
| `ERR-SSO-400-MISSING_VERIFIER` | 缺少 PKCE `code_verifier` | Missing PKCE code verifier. |
| `ERR-SSO-401-TOKEN_EXCHANGE` | Token 交换失败 | Token exchange failed. |
| `ERR-SSO-500-VERIFIER_GEN` | 生成 PKCE verifier 失败 | Failed to generate PKCE verifier. |
| `ERR-CAPTCHA-503` | CAPTCHA 服务不可用 | CAPTCHA service unavailable. Please try again later or contact the NOC. |
| `ERR-CAPTCHA-403` | CAPTCHA 校验失败 | CAPTCHA verification failed. |

## 使用约束（必须）

- `error` 必须是面向用户的自然语言解释 + `(<Code>).`，不要返回内部 key（如 `invalid_request` / `exec_failed`）。
- 不要把底层异常/堆栈/敏感信息直接透传给用户；内部排障请用日志或追踪系统承接。
