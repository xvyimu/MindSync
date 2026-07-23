//! M4 mock stream + Abort registry (Electron stream-registry semantic subset).
//!
//! - `desktop-stream-demo`: mock token stream for a given `streamId`
//! - `stream-cancel`: abort owner stream; subsequent chunks must not emit
//! - Events: `stream-content-{id}`, `stream-finish-{id}`, `stream-error-{id}`
//!   (aligned with Electron `LLM_STREAM_CHANNELS` + `streamId` suffix)

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use serde::Serialize;
use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager, State};

use crate::{is_valid_stream_id, IpcEnvelope};

/// Active mock streams keyed by streamId. Value is the abort flag (true = cancelled).
pub struct StreamRegistry {
    streams: Mutex<HashMap<String, Arc<AtomicBool>>>,
}

impl Default for StreamRegistry {
    fn default() -> Self {
        Self {
            streams: Mutex::new(HashMap::new()),
        }
    }
}

impl StreamRegistry {
    fn register(&self, stream_id: &str) -> Result<Arc<AtomicBool>, IpcEnvelope> {
        let mut guard = self
            .streams
            .lock()
            .map_err(|_| IpcEnvelope::err("IPC_HANDLER_FAILED", "stream registry lock poisoned"))?;
        if guard.contains_key(stream_id) {
            return Err(IpcEnvelope::err(
                "IPC_STREAM_ALREADY_EXISTS",
                "IPC stream identifier is already active",
            ));
        }
        let flag = Arc::new(AtomicBool::new(false));
        guard.insert(stream_id.to_string(), Arc::clone(&flag));
        Ok(flag)
    }

    fn cancel(&self, stream_id: &str) -> Result<bool, IpcEnvelope> {
        let mut guard = self
            .streams
            .lock()
            .map_err(|_| IpcEnvelope::err("IPC_HANDLER_FAILED", "stream registry lock poisoned"))?;
        let Some(flag) = guard.remove(stream_id) else {
            return Err(IpcEnvelope::err(
                "IPC_STREAM_NOT_FOUND",
                "IPC stream was not found",
            ));
        };
        flag.store(true, Ordering::SeqCst);
        Ok(true)
    }

    fn complete(&self, stream_id: &str) {
        if let Ok(mut guard) = self.streams.lock() {
            guard.remove(stream_id);
        }
    }

    fn is_aborted(flag: &AtomicBool) -> bool {
        flag.load(Ordering::SeqCst)
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct StreamCancelResult {
    cancelled: bool,
}

fn event_name(channel: &str, stream_id: &str) -> String {
    format!("{channel}-{stream_id}")
}

fn emit_content(app: &AppHandle, stream_id: &str, token: &str) {
    let _ = app.emit(&event_name("stream-content", stream_id), token);
}

fn emit_finish(app: &AppHandle, stream_id: &str, content: &str) {
    let payload = serde_json::json!({ "content": content });
    let _ = app.emit(&event_name("stream-finish", stream_id), payload);
}

/// Mock streaming demo: emits N content chunks then finish, unless cancelled.
///
/// Parameters mirror Electron stream ownership: client supplies `streamId`.
/// Does **not** call real LLM APIs (M4 proof only).
///
/// Async command returns `Result` (Tauri requirement when the future outlives
/// the invoke message). Registry is taken via `AppHandle::state` so we avoid
/// `State<'_, _>` lifetime on the async boundary.
#[tauri::command(rename = "desktop-stream-demo", rename_all = "camelCase")]
pub async fn desktop_stream_demo(
    app: AppHandle,
    stream_id: String,
    chunk_count: Option<u32>,
    interval_ms: Option<u64>,
) -> Result<IpcEnvelope, String> {
    if !is_valid_stream_id(&stream_id) {
        return Ok(IpcEnvelope::err(
            "IPC_INVALID_STREAM_ID",
            "Invalid IPC stream identifier",
        ));
    }

    let chunks = chunk_count.unwrap_or(8).clamp(1, 64);
    let interval = Duration::from_millis(interval_ms.unwrap_or(40).clamp(5, 2_000));

    let abort_flag = {
        let registry = app.state::<StreamRegistry>();
        match registry.register(&stream_id) {
            Ok(f) => f,
            Err(env) => return Ok(env),
        }
    };

    // Run on blocking pool so sleep does not stall the async runtime.
    let app_for_task = app.clone();
    let stream_id_for_task = stream_id.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        let mut assembled = String::new();

        for i in 0..chunks {
            if StreamRegistry::is_aborted(&abort_flag) {
                // Cancelled: do not emit further content/finish.
                return Ok::<(), ()>(());
            }

            let token = format!("chunk-{i}");
            assembled.push_str(&token);
            emit_content(&app_for_task, &stream_id_for_task, &token);

            // Pause so `stream-cancel` can race in between chunks.
            std::thread::sleep(interval);
        }

        if StreamRegistry::is_aborted(&abort_flag) {
            return Ok(());
        }

        emit_finish(&app_for_task, &stream_id_for_task, &assembled);
        Ok(())
    })
    .await;

    // complete only if still registered (cancel already removed the entry)
    app.state::<StreamRegistry>().complete(&stream_id);

    match result {
        Ok(Ok(())) => Ok(IpcEnvelope::ok(Value::Null)),
        Ok(Err(())) => Ok(IpcEnvelope::ok(Value::Null)),
        Err(err) => Ok(IpcEnvelope::err(
            "IPC_HANDLER_FAILED",
            format!("stream demo task failed: {err}"),
        )),
    }
}

/// Cancel an active stream by id (Electron `stream-cancel` parity).
#[tauri::command(rename = "stream-cancel", rename_all = "camelCase")]
pub fn stream_cancel(registry: State<'_, StreamRegistry>, stream_id: String) -> IpcEnvelope {
    if !is_valid_stream_id(&stream_id) {
        return IpcEnvelope::err("IPC_INVALID_STREAM_ID", "Invalid IPC stream identifier");
    }
    match registry.cancel(&stream_id) {
        Ok(cancelled) => IpcEnvelope::ok(StreamCancelResult { cancelled }),
        Err(env) => env,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn register_cancel_sets_abort_flag() {
        let reg = StreamRegistry::default();
        let flag = reg.register("stream_1").expect("register");
        assert!(!flag.load(Ordering::SeqCst));
        assert!(reg.cancel("stream_1").expect("cancel"));
        assert!(flag.load(Ordering::SeqCst));
        assert!(matches!(
            reg.cancel("stream_1"),
            Err(env) if env.success == false
        ));
    }

    #[test]
    fn duplicate_stream_id_rejected() {
        let reg = StreamRegistry::default();
        reg.register("stream_dup").unwrap();
        assert!(reg.register("stream_dup").is_err());
    }
}
