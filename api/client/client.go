package client

import (
	"bufio"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"strconv"
	"time"

	errx "bird-lg/server/internal/errors"
	"bird-lg/server/internal/model"

	fastjson "github.com/goccy/go-json"
	"github.com/gofiber/fiber/v3"
	fiberclient "github.com/gofiber/fiber/v3/client"
)

func JSONMarshal(v any) ([]byte, error) {
	return fastjson.Marshal(v)
}

func JSONUnmarshal(data []byte, v any) error {
	return fastjson.Unmarshal(data, v)
}

func NewHTTPClient() *fiberclient.Client {
	cc := fiberclient.New()
	cc.SetJSONMarshal(JSONMarshal)
	cc.SetJSONUnmarshal(JSONUnmarshal)
	return cc
}

func ComputeSignature(secret, timestamp, method, requestURI string, body []byte) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(timestamp + ":" + method + ":" + requestURI + ":" + string(body)))
	return base64.StdEncoding.EncodeToString(h.Sum(nil))
}

func marshalClientJSON(cc *fiberclient.Client, payload any) ([]byte, error) {
	return cc.JSONMarshal()(payload)
}

func StreamFromUpstream(w *bufio.Writer, endpoint, upstreamPath string, reqPayload any, hmacSecret string, timeout time.Duration) {
	cc := NewHTTPClient()
	if fc := cc.FasthttpClient(); fc != nil {
		fc.StreamResponseBody = true
	}

	reqBody, err := marshalClientJSON(cc, reqPayload)
	if err != nil {
		fmt.Fprintf(w, "error: %s\n", errx.FormatPublicError(errx.ErrCodeReqBadRequest, "Invalid request"))
		return
	}

	req := cc.R()
	resp := fiberclient.AcquireResponse()
	defer fiberclient.ReleaseRequest(req)
	defer fiberclient.ReleaseResponse(resp)

	rawReq := req.RawRequest
	rawReq.SetRequestURI(endpoint + upstreamPath)
	rawReq.Header.SetMethod(fiber.MethodPost)
	rawReq.Header.SetContentType("application/json")
	rawReq.SetBody(reqBody)

	if hmacSecret != "" {
		timestamp := strconv.FormatInt(time.Now().Unix(), 10)
		signature := ComputeSignature(hmacSecret, timestamp, fiber.MethodPost, upstreamPath, reqBody)
		rawReq.Header.Set("X-Signature", signature)
		rawReq.Header.Set("X-Timestamp", timestamp)
	}

	if err := cc.DoTimeout(rawReq, resp.RawResponse, timeout); err != nil {
		fmt.Fprintf(w, "error: %s\n", errx.FormatPublicError(errx.ErrCodeUpstreamConnectFailed, "Failed to connect to upstream client"))
		return
	}

	stream := resp.RawResponse.BodyStream()
	if stream == nil {
		fmt.Fprint(w, string(resp.Body()))
		return
	}

	reader := bufio.NewReader(stream)
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			break
		}
		fmt.Fprint(w, line)
		w.Flush()
	}
}

func ProxyToClientPath(endpoint, path string, request any, hmacSecret string) (model.APIGenericResponse, error) {
	cc := NewHTTPClient()
	cc.SetTimeout(30 * time.Second)

	body, err := marshalClientJSON(cc, request)
	if err != nil {
		return model.APIGenericResponse{}, err
	}

	req := cc.R()
	req.SetHeader("Content-Type", "application/json")
	req.SetRawBody(body)

	if hmacSecret != "" {
		timestamp := strconv.FormatInt(time.Now().Unix(), 10)
		signature := ComputeSignature(hmacSecret, timestamp, fiber.MethodPost, path, body)
		req.SetHeader("X-Signature", signature)
		req.SetHeader("X-Timestamp", timestamp)
	}

	resp, err := req.Post(endpoint + path)
	if err != nil {
		return model.APIGenericResponse{}, fiber.NewError(fiber.StatusBadGateway, errx.FormatPublicError(errx.ErrCodeUpstreamConnectFailed, "Failed to connect to upstream client"))
	}

	var result model.APIGenericResponse
	if err := resp.JSON(&result); err != nil {
		return model.APIGenericResponse{}, err
	}

	if resp.StatusCode() == fiber.StatusTooManyRequests {
		return result, nil
	}
	if resp.StatusCode() != fiber.StatusOK {
		return model.APIGenericResponse{}, fiber.NewError(fiber.StatusBadGateway, errx.FormatPublicError(errx.ErrCodeUpstreamBadStatus, "Upstream client returned an error"))
	}
	return result, nil
}
