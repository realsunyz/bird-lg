package stream

import (
	"bufio"
	"fmt"
)

func WriteData(w *bufio.Writer, payload string) {
	fmt.Fprintf(w, "data: %s\n\n", payload)
	w.Flush()
}
