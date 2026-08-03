use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::thread;
use std::time::{Duration, Instant};

use crate::port::health_url;

pub struct ServerProcess {
    child: Child,
}

impl ServerProcess {
    pub fn spawn(
        binary: &Path,
        host: &str,
        port: u16,
        web_root: &Path,
    ) -> Result<Self, String> {
        let child = Command::new(binary)
            .arg("--host")
            .arg(host)
            .arg("--port")
            .arg(port.to_string())
            .arg("--web-root")
            .arg(web_root)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|error| format!("failed to start pixelanea-server: {error}"))?;

        Ok(Self { child })
    }

    pub fn wait_for_health(&self, host: &str, port: u16) -> Result<(), String> {
        let url = health_url(host, port);
        let deadline = Instant::now() + Duration::from_secs(15);

        while Instant::now() < deadline {
            if let Ok(response) = ureq::get(&url).call() {
                if response.status() == 200 {
                    return Ok(());
                }
            }
            thread::sleep(Duration::from_millis(200));
        }

        Err(format!("pixelanea-server did not become healthy at {url}"))
    }
}

impl Drop for ServerProcess {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}
