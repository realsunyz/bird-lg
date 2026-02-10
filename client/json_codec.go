package main

import fastjson "github.com/goccy/go-json"

func jsonMarshal(v any) ([]byte, error) {
	return fastjson.Marshal(v)
}

func jsonUnmarshal(data []byte, v any) error {
	return fastjson.Unmarshal(data, v)
}
