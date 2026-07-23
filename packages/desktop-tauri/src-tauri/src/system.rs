//! B1 system + app shell helpers (Electron `SYSTEM_CHANNELS` parity subset).
//!
//! - `config-getEnvironmentVariables` — public VITE_* whitelist only
//! - `app-set-locale` — store UI locale for native chrome (menu DEFER)
//! - `logs-get-paths` / `logs-open-directory` — app log dir under user data

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;

use regex::Regex;
use serde::Serialize;
use tauri::{AppHandle, Manager, State};

use crate::IpcEnvelope;

/// Supported UI locales (Electron `SUPPORTED_UI_LOCALES` parity).
const SUPPORTED_UI_LOCALES: &[&str] = &["zh-CN", "zh-TW", "en-US"];

/// Locale held for future native menu/context-menu rebuild (menu still DEFER).
pub struct UiLocaleState {
    locale: Mutex<String>,
}

impl Default for UiLocaleState {
    fn default() -> Self {
        Self {
            locale: Mutex::new("en-US".to_string()),
        }
    }
}

impl UiLocaleState {
    pub fn set(&self, locale: String) -> Result<(), IpcEnvelope> {
        let mut guard = self
            .locale
            .lock()
            .map_err(|_| IpcEnvelope::err("IPC_HANDLER_FAILED", "ui locale lock poisoned"))?;
        *guard = locale;
        Ok(())
    }

    #[cfg(test)]
    pub fn get(&self) -> Result<String, IpcEnvelope> {
        let guard = self
            .locale
            .lock()
            .map_err(|_| IpcEnvelope::err("IPC_HANDLER_FAILED", "ui locale lock poisoned"))?;
        Ok(guard.clone())
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct LogPaths {
    log_dir: String,
    main: String,
    desktop: String,
    updater: String,
    ipc: String,
    error: String,
}

fn is_public_runtime_config_key(key: &str) -> bool {
    // Electron runtime-security.js parity.
    static PUBLIC: std::sync::OnceLock<Regex> = std::sync::OnceLock::new();
    static SENSITIVE: std::sync::OnceLock<Regex> = std::sync::OnceLock::new();
    let public = PUBLIC.get_or_init(|| {
        Regex::new(r"^VITE_(?:APP|PUBLIC)_[A-Z0-9_]+$").expect("public env regex")
    });
    let sensitive = SENSITIVE.get_or_init(|| {
        Regex::new(
            r"(?i)(?:^|_)(?:API_KEY|KEY|TOKEN|SECRET|PASSWORD|PASS|AUTHORIZATION|HEADERS|CREDENTIALS?|COOKIE|PRIVATE)(?:_|$)",
        )
        .expect("sensitive env regex")
    });
    public.is_match(key) && !sensitive.is_match(key)
}

/// Extract renderer-visible public env (with and without `VITE_` prefix).
pub(crate) fn public_runtime_config_from_env(
    env: impl IntoIterator<Item = (String, String)>,
) -> HashMap<String, String> {
    let mut config = HashMap::new();
    for (key, value) in env {
        if !is_public_runtime_config_key(&key) || value.is_empty() {
            continue;
        }
        let without_prefix = key.strip_prefix("VITE_").unwrap_or(&key).to_string();
        config.insert(key, value.clone());
        config.insert(without_prefix, value);
    }
    config
}

/// Normalize locale string → supported id or default `en-US` (Electron parity).
pub(crate) fn normalize_ui_locale(locale: Option<&str>) -> String {
    let Some(raw) = locale.map(str::trim).filter(|s| !s.is_empty()) else {
        return "en-US".to_string();
    };
    if SUPPORTED_UI_LOCALES.contains(&raw) {
        return raw.to_string();
    }
    let lower = raw.to_ascii_lowercase();
    if lower.starts_with("zh") {
        if lower.contains("tw") || lower.contains("hk") || lower.contains("hant") {
            return "zh-TW".to_string();
        }
        return "zh-CN".to_string();
    }
    if lower.starts_with("en") {
        return "en-US".to_string();
    }
    "en-US".to_string()
}

fn resolve_log_dir(app: &AppHandle) -> Result<PathBuf, IpcEnvelope> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|err| {
            IpcEnvelope::err(
                "IPC_HANDLER_FAILED",
                format!("Failed to resolve app data dir: {err}"),
            )
        })?;
    Ok(base.join("logs"))
}

fn log_paths_for(log_dir: &PathBuf) -> LogPaths {
    LogPaths {
        log_dir: log_dir.to_string_lossy().into_owned(),
        main: log_dir.join("main.log").to_string_lossy().into_owned(),
        desktop: log_dir.join("desktop.log").to_string_lossy().into_owned(),
        updater: log_dir.join("updater.log").to_string_lossy().into_owned(),
        ipc: log_dir.join("ipc.log").to_string_lossy().into_owned(),
        error: log_dir.join("error.log").to_string_lossy().into_owned(),
    }
}

/// Public runtime config for renderer (`config-getEnvironmentVariables`).
#[tauri::command(rename = "config-getEnvironmentVariables")]
pub fn config_get_environment_variables() -> IpcEnvelope {
    let env = std::env::vars();
    let public = public_runtime_config_from_env(env);
    IpcEnvelope::ok(public)
}

/// Sync UI locale from renderer (`app-set-locale`).
#[tauri::command(rename = "app-set-locale", rename_all = "camelCase")]
pub fn app_set_locale(locale: Option<String>, state: State<'_, UiLocaleState>) -> IpcEnvelope {
    let normalized = normalize_ui_locale(locale.as_deref());
    if let Err(err) = state.set(normalized) {
        return err;
    }
    IpcEnvelope::ok_null()
}

/// Log file path map (`logs-get-paths`).
#[tauri::command(rename = "logs-get-paths")]
pub fn logs_get_paths(app: AppHandle) -> IpcEnvelope {
    match resolve_log_dir(&app) {
        Ok(dir) => IpcEnvelope::ok(log_paths_for(&dir)),
        Err(err) => err,
    }
}

/// Open log directory in the OS file manager (`logs-open-directory`).
#[tauri::command(rename = "logs-open-directory")]
pub fn logs_open_directory(app: AppHandle) -> IpcEnvelope {
    let log_dir = match resolve_log_dir(&app) {
        Ok(dir) => dir,
        Err(err) => return err,
    };

    if let Err(err) = std::fs::create_dir_all(&log_dir) {
        return IpcEnvelope::err(
            "IPC_HANDLER_FAILED",
            format!("Failed to create log directory: {err}"),
        );
    }

    match open::that(&log_dir) {
        Ok(()) => IpcEnvelope::ok(true),
        Err(err) => IpcEnvelope::err(
            "IPC_HANDLER_FAILED",
            format!("Failed to open log directory: {err}"),
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn public_env_whitelist_strips_secrets_and_duplicates_prefix() {
        let env = vec![
            ("VITE_APP_TITLE".into(), "MindSync".into()),
            ("VITE_APP_API_KEY".into(), "should-drop".into()),
            ("VITE_PUBLIC_DOCS_URL".into(), "https://example.com".into()),
            ("SECRET_TOKEN".into(), "nope".into()),
            ("VITE_APP_EMPTY".into(), "".into()),
        ];
        let cfg = public_runtime_config_from_env(env);
        assert_eq!(cfg.get("VITE_APP_TITLE").map(String::as_str), Some("MindSync"));
        assert_eq!(cfg.get("APP_TITLE").map(String::as_str), Some("MindSync"));
        assert_eq!(
            cfg.get("VITE_PUBLIC_DOCS_URL").map(String::as_str),
            Some("https://example.com")
        );
        assert_eq!(
            cfg.get("PUBLIC_DOCS_URL").map(String::as_str),
            Some("https://example.com")
        );
        assert!(!cfg.contains_key("VITE_APP_API_KEY"));
        assert!(!cfg.contains_key("SECRET_TOKEN"));
        assert!(!cfg.contains_key("VITE_APP_EMPTY"));
    }

    #[test]
    fn normalize_ui_locale_matches_electron() {
        assert_eq!(normalize_ui_locale(Some("zh-CN")), "zh-CN");
        assert_eq!(normalize_ui_locale(Some("zh-TW")), "zh-TW");
        assert_eq!(normalize_ui_locale(Some("en-US")), "en-US");
        assert_eq!(normalize_ui_locale(Some("zh")), "zh-CN");
        assert_eq!(normalize_ui_locale(Some("zh-HK")), "zh-TW");
        assert_eq!(normalize_ui_locale(Some("en-GB")), "en-US");
        assert_eq!(normalize_ui_locale(Some("fr-FR")), "en-US");
        assert_eq!(normalize_ui_locale(None), "en-US");
        assert_eq!(normalize_ui_locale(Some("")), "en-US");
    }

    #[test]
    fn ui_locale_state_roundtrip() {
        let state = UiLocaleState::default();
        state.set("zh-CN".into()).unwrap();
        assert_eq!(state.get().unwrap(), "zh-CN");
    }
}
