package models

import (
	"encoding/json"
	"time"
)

type DelayedTask struct {
	ID        string          `json:"id"`
	TaskType  string          `json:"task_type"`
	Data      json.RawMessage `json:"data"`
	CreatedAt time.Time       `json:"created_at"`
}

type TaskResult struct {
	ID        string      `json:"id"`
	Result    interface{} `json:"result"`
	Error     string      `json:"error,omitempty"`
	CreatedAt time.Time   `json:"created_at"`
}
