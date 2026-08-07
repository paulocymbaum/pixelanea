use std::fs;
use std::path::PathBuf;

fn ensure_bundle_resources() {
    let manifest_dir = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR"));
    let resource_dir = manifest_dir.join("bundle-resources/pixelanea");
    let web_index = resource_dir.join("web/index.html");
    let server_binary = if cfg!(windows) {
        resource_dir.join("pixelanea-server.exe")
    } else {
        resource_dir.join("pixelanea-server")
    };

    if web_index.is_file() && server_binary.is_file() {
        return;
    }

    fs::create_dir_all(resource_dir.join("web")).expect("create bundle-resources/web");
    if !web_index.is_file() {
        fs::write(&web_index, "<!doctype html><html><body></body></html>")
            .expect("write bundle-resources placeholder index.html");
    }
    if !server_binary.is_file() {
        fs::write(&server_binary, b"").expect("write bundle-resources placeholder server binary");
    }

    println!("cargo:rerun-if-changed=bundle-resources");
}

fn main() {
    ensure_bundle_resources();
    tauri_build::build()
}
