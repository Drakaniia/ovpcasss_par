use std::os::windows::process::CommandExt;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_dialog::DialogExt;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use tokio::sync::oneshot;
use tokio_util::io::ReaderStream;

mod dwm;
mod startup;
mod window_bounds;
mod window_chrome;
mod window_state;

/// Windows Credential Manager entry for the desktop session (phase 15 §2).
const KEYRING_SERVICE: &str = "par.ovpcasss@buksu.edu.ph";
const KEYRING_USER: &str = "session";

/// Mirrors the uploader's accepted extensions; the API remains authoritative.
const ATTACHMENT_EXTENSIONS: &[&str] = &[
    "pdf", "png", "jpg", "jpeg", "gif", "webp", "heic", "bmp", "tif", "tiff", "doc", "docx",
    "xls", "xlsx", "ppt", "pptx", "txt", "csv", "zip", "rar", "7z",
];

#[tauri::command]
fn token_read() -> Result<Option<String>, String> {
    let entry =
        keyring::Entry::new(KEYRING_SERVICE, KEYRING_USER).map_err(|error| error.to_string())?;

    match entry.get_password() {
        Ok(token) => Ok(Some(token)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(error.to_string()),
    }
}

#[tauri::command]
fn token_write(token: String) -> Result<(), String> {
    keyring::Entry::new(KEYRING_SERVICE, KEYRING_USER)
        .and_then(|entry| entry.set_password(&token))
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn token_clear() -> Result<(), String> {
    let entry =
        keyring::Entry::new(KEYRING_SERVICE, KEYRING_USER).map_err(|error| error.to_string())?;

    match entry.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}

/// Opens the folder the webview saved a download into (phase 14 §4). Windows
/// only, like the desktop shell itself.
/// Stops the pending sign-in when the user cancels or nothing arrives back.
static GOOGLE_CANCEL: Mutex<Option<oneshot::Sender<()>>> = Mutex::new(None);

/// Reads one query parameter from a raw HTTP request line.
fn query_param(request: &str, key: &str) -> Option<String> {
    let target = request.lines().next()?.split_whitespace().nth(1)?;
    let query = target.split_once('?')?.1;

    query.split('&').find_map(|pair| {
        let (name, value) = pair.split_once('=')?;
        (name == key).then(|| value.to_string())
    })
}

/// Runs Google sign-in in the system browser and collects the session token on
/// a loopback listener (RFC 8252). The nonce proves the reply came from the URL
/// this shell started; the token never waits in a webview-visible place.
#[tauri::command]
async fn google_sign_in(start_url: String, nonce: String) -> Result<String, String> {
    let listener = TcpListener::bind(("127.0.0.1", 0))
        .await
        .map_err(|error| format!("Could not open a local port: {error}"))?;
    let port = listener
        .local_addr()
        .map_err(|error| error.to_string())?
        .port();

    let url = format!("{start_url}&port={port}&nonce={nonce}");
    std::process::Command::new("cmd")
        .arg("/C")
        .raw_arg(format!("start \"\" \"{url}\""))
        .spawn()
        .map_err(|error| format!("Could not open the browser: {error}"))?;

    let hand_off = async {
        let (mut socket, _) = listener
            .accept()
            .await
            .map_err(|error| error.to_string())?;

        let mut buffer = [0u8; 4096];
        let read = socket
            .read(&mut buffer)
            .await
            .map_err(|error| error.to_string())?;
        let request = String::from_utf8_lossy(&buffer[..read]).to_string();

        let page = "<!doctype html><meta charset=\"utf-8\"><title>Paperless PAR</title>\
            <p style=\"font-family: system-ui, sans-serif; padding: 48px; text-align: center\">\
            Return to the Paperless PAR app to continue.</p>";
        let response = format!(
            "HTTP/1.1 200 OK\r\ncontent-type: text/html; charset=utf-8\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{page}",
            page.len()
        );
        let _ = socket.write_all(response.as_bytes()).await;

        Ok::<String, String>(request)
    };

    let (cancel_tx, cancel_rx) = oneshot::channel();
    *GOOGLE_CANCEL.lock().unwrap() = Some(cancel_tx);

    let outcome = tokio::select! {
        _ = cancel_rx => Err("google_cancelled".to_string()),
        result = tokio::time::timeout(Duration::from_secs(180), hand_off) => {
            result.map_err(|_| "Google sign-in timed out. Try again.".to_string())?
        }
    };
    GOOGLE_CANCEL.lock().unwrap().take();

    let request = outcome?;

    if query_param(&request, "nonce").as_deref() != Some(nonce.as_str()) {
        return Err("Google sign-in returned an unexpected state.".to_string());
    }

    let token = query_param(&request, "token").ok_or_else(|| {
        query_param(&request, "error").unwrap_or_else(|| "google_failed".to_string())
    })?;

    token_write(token.clone())?;
    Ok(token)
}

#[tauri::command]
fn google_cancel() {
    if let Some(sender) = GOOGLE_CANCEL.lock().unwrap().take() {
        let _ = sender.send(());
    }
}

#[tauri::command]
fn reveal_downloads(app: AppHandle) -> Result<(), String> {
    let folder = app
        .path()
        .download_dir()
        .map_err(|error| error.to_string())?;

    std::process::Command::new("explorer")
        .arg(&folder)
        .spawn()
        .map_err(|error| format!("Could not open {}: {error}", folder.display()))?;

    Ok(())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PickedFile {
    name: String,
    size: u64,
    mime_type: String,
    path: String,
}

#[tauri::command]
async fn pick_attachments(app: AppHandle) -> Result<Vec<PickedFile>, String> {
    let picked = tauri::async_runtime::spawn_blocking(move || {
        app.dialog()
            .file()
            .add_filter("Attachments", ATTACHMENT_EXTENSIONS)
            .blocking_pick_files()
    })
    .await
    .map_err(|error| error.to_string())?
    .unwrap_or_default();

    picked
        .into_iter()
        .map(|file| {
            let path: PathBuf = file
                .into_path()
                .map_err(|_| "That selection is not a local file.".to_string())?;
            let metadata = std::fs::metadata(&path)
                .map_err(|error| format!("{}: {error}", path.display()))?;

            Ok(PickedFile {
                name: path
                    .file_name()
                    .map(|name| name.to_string_lossy().into_owned())
                    .unwrap_or_else(|| "attachment".to_string()),
                size: metadata.len(),
                mime_type: mime_guess::from_path(&path)
                    .first_or_octet_stream()
                    .to_string(),
                path: path.to_string_lossy().into_owned(),
            })
        })
        .collect()
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct UploadRequest {
    url: String,
    method: String,
    headers: Vec<(String, String)>,
    path: String,
    upload_id: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct UploadProgress {
    upload_id: String,
    sent: u64,
    total: u64,
}

/// Streams the chosen file to the presigned URL (phase 15 §2), so a 25 MB
/// attachment never sits in webview memory. Progress is emitted per chunk.
#[tauri::command]
async fn upload_attachment(app: AppHandle, request: UploadRequest) -> Result<(), String> {
    let file = tokio::fs::File::open(&request.path)
        .await
        .map_err(|error| format!("{}: {error}", request.path))?;
    let total = file
        .metadata()
        .await
        .map_err(|error| format!("{}: {error}", request.path))?
        .len();

    let method = reqwest::Method::from_bytes(request.method.as_bytes())
        .map_err(|_| format!("Unsupported upload method {}.", request.method))?;

    let mut builder = reqwest::Client::new()
        .request(method, &request.url)
        .header(reqwest::header::CONTENT_LENGTH, total);

    for (name, value) in request.headers {
        builder = builder.header(name, value);
    }

    let sent = Arc::new(AtomicU64::new(0));
    let upload_id = request.upload_id.clone();
    let emitter = app.clone();
    let counter = Arc::clone(&sent);

    let stream = ReaderStream::new(file).map(move |chunk| {
        let chunk = chunk?;
        let done = counter.fetch_add(chunk.len() as u64, Ordering::Relaxed) + chunk.len() as u64;
        let _ = emitter.emit(
            "attachment-progress",
            UploadProgress {
                upload_id: upload_id.clone(),
                sent: done,
                total,
            },
        );
        Ok::<_, std::io::Error>(chunk)
    });

    let response = builder
        .body(reqwest::Body::wrap_stream(stream))
        .send()
        .await
        .map_err(|error| format!("The upload did not complete: {error}"))?;

    if !response.status().is_success() {
        let status = response.status().as_u16();
        let detail = response.text().await.unwrap_or_default();
        return Err(format!(
            "The upload failed with status {status}. {}",
            detail.trim().chars().take(200).collect::<String>()
        ));
    }

    let _ = app.emit(
        "attachment-progress",
        UploadProgress {
            upload_id: request.upload_id,
            sent: sent.load(Ordering::Relaxed).max(total),
            total,
        },
    );

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(startup::StartupState::new())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            token_read,
            token_write,
            token_clear,
            google_sign_in,
            google_cancel,
            pick_attachments,
            upload_attachment,
            reveal_downloads,
            window_chrome::set_maximize_hit_rect,
            window_chrome::open_devtools,
            startup::splash_painted,
            startup::frontend_ready
        ])
        .setup(|app| {
            // Bounds are applied before the splash reveals the window, so the
            // default size never flashes (chrome spec §9.3).
            let handle = app.handle();
            window_state::restore(handle);
            window_state::track(handle);
            dwm::apply(handle);
            window_chrome::install(handle);

            startup::spawn_ready_timeout(app);
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building the desktop shell")
        .run(|handle, event| {
            // The subclass must not outlive the window it wraps.
            if let tauri::RunEvent::Exit = event {
                window_chrome::uninstall(handle);
            }
        });
}
