package platform

import fastjson "github.com/goccy/go-json"

func JSONMarshal(v any) ([]byte, error) {
	return fastjson.Marshal(v)
}

func JSONUnmarshal(data []byte, v any) error {
	return fastjson.Unmarshal(data, v)
}
