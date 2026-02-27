package logx

import (
	"fmt"
	"log"
	"os"
	"sync"
	"time"
)

var once sync.Once

func configure() {
	log.SetFlags(0)
	log.SetPrefix("")
}

func output(level, message string) {
	once.Do(configure)
	timestamp := time.Now().Format(time.RFC3339)
	log.Printf("%s [%s] %s", timestamp, level, message)
}

func Infof(format string, args ...any) {
	output("INFO", fmt.Sprintf(format, args...))
}

func Warnf(format string, args ...any) {
	output("WARN", fmt.Sprintf(format, args...))
}

func Fatalf(format string, args ...any) {
	output("FATAL", fmt.Sprintf(format, args...))
	os.Exit(1)
}
