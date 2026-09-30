use crate::models::Result;
use crate::config::Settings;

pub struct PushProvider {
    app_id: Option<String>,
}

impl PushProvider {
    pub fn new(settings: &Settings) -> Self {
        Self {
            app_id: settings.push_app_id.clone(),
        }
    }

    /// Create a PushProvider with an explicit app_id (useful for testing).
    pub fn with_app_id(app_id: Option<String>) -> Self {
        Self { app_id }
    }

    /// Check whether push notifications are configured.
    pub fn is_configured(&self) -> bool {
        self.app_id.is_some()
    }

    /// Send a push notification to a recipient.
    ///
    /// When `app_id` is not configured, the send is stubbed (logged but not delivered).
    /// When `app_id` is configured, this would integrate with FCM or APNs.
    pub async fn send(&self, recipient: &str, message: &str) -> Result<()> {
        if recipient.is_empty() {
            return Err(crate::models::NotificationError::InvalidRecipient(
                "recipient cannot be empty".to_string(),
            ));
        }

        if message.is_empty() {
            return Err(crate::models::NotificationError::Delivery {
                channel: crate::models::NotificationChannel::Push,
                reason: "message cannot be empty".to_string(),
            });
        }

        if self.app_id.is_none() {
            tracing::warn!(
                "Push app ID not configured; stubbing push notification to {}",
                recipient
            );
        }

        tracing::info!(
            "Push notification: to={}, message_len={}, configured={}",
            recipient,
            message.len(),
            self.is_configured()
        );

        // In production, this would call FCM/APNs APIs.
        // For now, we stub as per requirements.
        Ok(())
    }

    /// Send a push notification to multiple recipients.
    pub async fn send_batch(&self, recipients: &[&str], message: &str) -> Vec<Result<()>> {
        let mut results = Vec::with_capacity(recipients.len());
        for recipient in recipients {
            results.push(self.send(recipient, message).await);
        }
        results
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::Settings;
    use crate::models::{NotificationChannel, NotificationError};

    fn make_test_settings(app_id: Option<&str>) -> Settings {
        Settings {
            smtp_host: "localhost".to_string(),
            smtp_port: 587,
            smtp_user: String::new(),
            smtp_pass: String::new(),
            smtp_from: "noreply@test.com".to_string(),
            twilio_sid: String::new(),
            twilio_auth_token: String::new(),
            twilio_from_number: String::new(),
            push_app_id: app_id.map(|s| s.to_string()),
        }
    }

    #[tokio::test]
    async fn test_send_without_app_id_stubs_successfully() {
        let settings = make_test_settings(None);
        let provider = PushProvider::new(&settings);
        assert!(!provider.is_configured());
        let result = provider.send("user-123", "Hello world").await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_send_with_app_id_succeeds() {
        let settings = make_test_settings(Some("fcm-server-key-123"));
        let provider = PushProvider::new(&settings);
        assert!(provider.is_configured());
        let result = provider.send("device-token-abc", "Notification").await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_send_empty_recipient_returns_error() {
        let provider = PushProvider::with_app_id(Some("app-id".to_string()));
        let result = provider.send("", "Hello").await;
        assert!(result.is_err());
        match result.unwrap_err() {
            NotificationError::InvalidRecipient(msg) => assert!(msg.contains("empty")),
            other => panic!("Expected InvalidRecipient, got {:?}", other),
        }
    }

    #[tokio::test]
    async fn test_send_empty_message_returns_error() {
        let provider = PushProvider::with_app_id(Some("app-id".to_string()));
        let result = provider.send("user-123", "").await;
        assert!(result.is_err());
        match result.unwrap_err() {
            NotificationError::Delivery { channel, reason } => {
                assert_eq!(channel, NotificationChannel::Push);
                assert!(reason.contains("empty"));
            }
            other => panic!("Expected Delivery error, got {:?}", other),
        }
    }

    #[tokio::test]
    async fn test_send_batch_all_succeed() {
        let provider = PushProvider::with_app_id(Some("app-id".to_string()));
        let results = provider.send_batch(&["user-1", "user-2", "user-3"], "Batch").await;
        assert_eq!(results.len(), 3);
        for r in &results { assert!(r.is_ok()); }
    }

    #[tokio::test]
    async fn test_send_batch_with_empty_recipient() {
        let provider = PushProvider::with_app_id(Some("app-id".to_string()));
        let results = provider.send_batch(&["user-1", "", "user-3"], "Batch").await;
        assert_eq!(results.len(), 3);
        assert!(results[0].is_ok());
        assert!(results[1].is_err());
        assert!(results[2].is_ok());
    }

    #[tokio::test]
    async fn test_send_batch_empty_list() {
        let provider = PushProvider::with_app_id(Some("app-id".to_string()));
        let results = provider.send_batch(&[], "Message").await;
        assert_eq!(results.len(), 0);
    }

    #[test]
    fn test_is_configured_with_app_id() {
        let provider = PushProvider::with_app_id(Some("fcm-key".to_string()));
        assert!(provider.is_configured());
    }

    #[test]
    fn test_is_configured_without_app_id() {
        let provider = PushProvider::with_app_id(None);
        assert!(!provider.is_configured());
    }

    #[test]
    fn test_new_from_settings_with_app_id() {
        let settings = make_test_settings(Some("test-app-id"));
        let provider = PushProvider::new(&settings);
        assert!(provider.is_configured());
    }

    #[test]
    fn test_new_from_settings_without_app_id() {
        let settings = make_test_settings(None);
        let provider = PushProvider::new(&settings);
        assert!(!provider.is_configured());
    }

    #[tokio::test]
    async fn test_send_long_message() {
        let provider = PushProvider::with_app_id(Some("app-id".to_string()));
        let long_message = "A".repeat(4096);
        let result = provider.send("user-123", &long_message).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_send_special_characters_in_recipient() {
        let provider = PushProvider::with_app_id(Some("app-id".to_string()));
        let result = provider.send("device+token@example.com", "Hello").await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_send_unicode_message() {
        let provider = PushProvider::with_app_id(Some("app-id".to_string()));
        let result = provider.send("user-123", "Hello World").await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_send_batch_mixed_validity() {
        let provider = PushProvider::with_app_id(None);
        let results = provider.send_batch(&["valid-user", "", "another-valid"], "Msg").await;
        assert_eq!(results.len(), 3);
        assert!(results[0].is_ok());
        assert!(results[1].is_err());
        assert!(results[2].is_ok());
    }
}
