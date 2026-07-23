//! MindSync Tauri 2 shell — M1 skeleton.
//! Opens a window that loads the existing Vue/Vite UI (`@mindsync/web`).
//! No domain IPC yet (Electron remains the production shell).

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running MindSync Tauri application");
}
