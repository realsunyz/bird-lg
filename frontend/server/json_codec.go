package main

import (
	fastjson "github.com/goccy/go-json"
	"github.com/gofiber/fiber/v3/client"
)

func jsonMarshal(v any) ([]byte, error) {
	return fastjson.Marshal(v)
}

func jsonUnmarshal(data []byte, v any) error {
	return fastjson.Unmarshal(data, v)
}

func newHTTPClient() *client.Client {
	cc := client.New()
	cc.SetJSONMarshal(jsonMarshal)
	cc.SetJSONUnmarshal(jsonUnmarshal)
	return cc
}
