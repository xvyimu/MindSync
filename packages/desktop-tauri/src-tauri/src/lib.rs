//! MindSync Tauri 2 shell — M2 P0 commands.
//!
//! Opens a window that loads `@mindsync/web` and exposes the P0 invoke surface
//! required by `@mindsync/core` desktop facade:
//! `app-get-version`, `preference-get` / `preference-set`, `desktop-ping`,
//! `shell-openExternal`.
//!
//! Response shape mirrors Electron IPC envelope: `{ success, data }` / `{ success: false, error }`.
//! Electron remains the production shell until G3 cutover.

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;
use serde_json::Value;
use tauri::{AppHandle, State};

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
struct IpcEnvelope {
    success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<IpcErrorBody>,
}

impl IpcEnvelope {
    fn ok(data: impl Serialize) -> Self {
        Self {
            success: true,
            data: Some(serde_json::to_value(data).unwrap_or(Value::Null)),
            error: None,
        }
    }

    fn ok_null() -> Self {
        Self {
            success: true,
            data: Some(Value::Null),
            error: None,
        }
    }

    fn err(code: &str, message: impl Into<String>) -> Self {
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
        .invoke_handler(tauri::generate_handler![
            app_get_version,
            preference_get,
            preference_set,
            desktop_ping,
            shell_open_external,
        ])
        .run(tauri::generate_context!())
        .expect("error while running MindSync Tauri application");
}
