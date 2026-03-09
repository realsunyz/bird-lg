package runner

import (
	"bufio"
	"context"
	"os/exec"
)

type CommandRunner interface {
	CombinedOutput(ctx context.Context, bin string, args []string) ([]byte, error)
	Stream(ctx context.Context, bin string, args []string, onLine func(string)) error
}

type SystemRunner struct{}

func (SystemRunner) CombinedOutput(ctx context.Context, bin string, args []string) ([]byte, error) {
	cmd := exec.CommandContext(ctx, bin, args...)
	return cmd.CombinedOutput()
}

func (SystemRunner) Stream(ctx context.Context, bin string, args []string, onLine func(string)) error {
	cmd := exec.CommandContext(ctx, bin, args...)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	if err := cmd.Start(); err != nil {
		return err
	}

	scanner := bufio.NewScanner(stdout)
	for scanner.Scan() {
		onLine(scanner.Text())
	}

	if err := scanner.Err(); err != nil {
		_ = cmd.Wait()
		return err
	}
	return cmd.Wait()
}
