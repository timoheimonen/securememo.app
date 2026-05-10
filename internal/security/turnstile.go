package security

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
)

var turnstileTokenRe = regexp.MustCompile(`^[A-Za-z0-9._-]{10,}$`)

type TurnstileVerifier struct {
	Enabled bool
	Secret  string
	Bypass  bool
	Client  *http.Client
}

func (v TurnstileVerifier) Verify(ctx context.Context, token string) error {
	if !v.Enabled {
		return nil
	}
	if v.Bypass {
		return nil
	}
	if !turnstileTokenRe.MatchString(token) {
		return errors.New("missing turnstile token")
	}
	if strings.TrimSpace(v.Secret) == "" {
		return errors.New("missing turnstile secret")
	}
	client := v.Client
	if client == nil {
		client = &http.Client{Timeout: 8 * time.Second}
	}

	form := url.Values{}
	form.Set("secret", v.Secret)
	form.Set("response", token)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://challenges.cloudflare.com/turnstile/v0/siteverify", strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return errors.New("turnstile verification failed")
	}
	var body struct {
		Success bool `json:"success"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return err
	}
	if !body.Success {
		return errors.New("turnstile verification failed")
	}
	return nil
}
