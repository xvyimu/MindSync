//! MindSync Tauri 2 shell — P0 + M4 stream + B1 system channels.
//!
//! Opens a window that loads `@mindsync/web` and exposes:
//! - P0: `app-get-version`, `preference-get` / `preference-set`, `desktop-ping`, `shell-openExternal`
//! - M4: `desktop-stream-demo`, `stream-cancel` (mock model; no real API keys)
//! - B1: `config-getEnvironmentVariables`, `app-set-locale`, `logs-get-paths`, `logs-open-directory`
//!
//! Response shape mirrors Electron IPC envelope: `{ success, data }` / `{ success: false, error }`.
//! Electron remains the production shell until G3 cutover.

mod stream;
mod system;

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;
use serde_json::Value;
use tauri::{AppHandle, State};

use stream::{desktop_stream_demo, stream_cancel, StreamRegistry};
use system::{
    app_set_locale, config_get_environment_variables, logs_get_paths, logs_open_directory,
    UiLocaleState,
};

/// In-memory non-secret preference store (M2). File-backed storage can replace this later.
pub struct PreferenceStore {
    values: Mutex<HashMap<String, Value>>,
}

impl Default for PreferenceStore {
    fn default() -> Self {
        Self {
            values: Mutex::new(HashMap::new()),
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct IpcErrorBody {
    code: String,
    message: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct IpcEnvelope {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<IpcErrorBody>,
}

impl IpcEnvelope {
    pub(crate) fn ok(data: impl Serialize) -> Self {
        Self {
            success: true,
            data: Some(serde_json::to_value(data).unwrap_or(Value::Null)),
            error: None,
        }
    }

    pub(crate) fn ok_null() -> Self {
        Self {
            success: true,
            data: Some(Value::Null),
            error: None,
        }
    }

    pub(crate) fn err(code: &str, message: impl Into<String>) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(IpcErrorBody {
                code: code.to_string(),
                message: message.into(),
            }),
        }
    }
}

/// Electron `STREAM_ID_PATTERN` parity: `^[A-Za-z0-9_-]{1,96}$`.
pub(crate) fn is_valid_stream_id(stream_id: &str) -> bool {
    let len = stream_id.len();
    (1..=96).contains(&len)
        && stream_id
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'-')
}

#[derive(Debug, Serialize)]
struct DesktopPingResult {
    ok: bool,
    shell: &'static str,
    ts: u64,
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn is_safe_external_url(value: &str) -> bool {
    let Ok(url) = url::Url::parse(value) else {
        return false;
    };
    matches!(url.scheme(), "http" | "https") && url.host_str().is_some()
}

/// Product version string (aligned with tauri.conf / package version).
#[tauri::command(rename = "app-get-version")]
fn app_get_version(app: AppHandle) -> IpcEnvelope {
    IpcEnvelope::ok(app.package_info().version.to_string())
}

/// Non-secret preference get: `(key, defaultValue) → value`.
#[tauri::command(rename = "preference-get", rename_all = "camelCase")]
fn preference_get(
    key: String,
    default_value: Value,
    store: State<'_, PreferenceStore>,
) -> IpcEnvelope {
    if key.is_empty() {
        return IpcEnvelope::err("IPC_INVALID_ARGUMENT", "preference-get requires a non-empty key");
    }
    let guard = match store.values.lock() {
        Ok(g) => g,
        Err(_) => return IpcEnvelope::err("IPC_HANDLER_FAILED", "preference store lock poisoned"),
    };
    let value = guard.get(&key).cloned().unwrap_or(default_value);
    IpcEnvelope::ok(value)
}

/// Non-secret preference set: `(key, value) → null`.
#[tauri::command(rename = "preference-set", rename_all = "camelCase")]
fn preference_set(
    key: String,
    value: Value,
    store: State<'_, PreferenceStore>,
) -> IpcEnvelope {
    if key.is_empty() {
        return IpcEnvelope::err("IPC_INVALID_ARGUMENT", "preference-set requires a non-empty key");
    }
    let mut guard = match store.values.lock() {
        Ok(g) => g,
        Err(_) => return IpcEnvelope::err("IPC_HANDLER_FAILED", "preference store lock poisoned"),
    };
    guard.insert(key, value);
    IpcEnvelope::ok_null()
}

/// Health probe: `() → { ok: true, shell: 'tauri', ts }`.
#[tauri::command(rename = "desktop-ping")]
fn desktop_ping() -> IpcEnvelope {
    IpcEnvelope::ok(DesktopPingResult {
        ok: true,
        shell: "tauri",
        ts: now_ms(),
    })
}

/// Open URL in the system browser. Only http(s) with a host (Electron parity).
#[tauri::command(rename = "shell-openExternal", rename_all = "camelCase")]
fn shell_open_external(url: String) -> IpcEnvelope {
    if !is_safe_external_url(&url) {
        return IpcEnvelope::err("IPC_INVALID_ARGUMENT", "Invalid IPC request arguments");
    }
    match open::that(&url) {
        Ok(()) => IpcEnvelope::ok(true),
        Err(err) => IpcEnvelope::err(
            "IPC_HANDLER_FAILED",
            format!("Failed to open external URL: {err}"),
        ),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(PreferenceStore::default())
        .manage(StreamRegistry::default())
        .manage(UiLocaleState::default())
        .invoke_handler(tauri::generate_handler![
            app_get_version,
            preference_get,
            preference_set,
            desktop_ping,
            shell_open_external,
            desktop_stream_demo,
            stream_cancel,
            config_get_environment_variables,
            app_set_locale,
            logs_get_paths,
            logs_open_directory,
        ])
        .run(tauri::generate_context!())
        .expect("error while running MindSync Tauri application");
}

#[cfg(test)]
mod tests {
    use super::is_valid_stream_id;

    #[test]
    fn stream_id_pattern_matches_electron() {
        assert!(is_valid_stream_id("stream_1"));
        assert!(is_valid_stream_id("stream_1710000000_abc12def"));
        assert!(!is_valid_stream_id(""));
        assert!(!is_valid_stream_id("bad id"));
        assert!(!is_valid_stream_id(&"x".repeat(97)));
    }
}
