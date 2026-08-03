use std::net::{SocketAddr, TcpListener, ToSocketAddrs};
use std::time::Duration;

pub fn is_port_listening(host: &str, port: u16) -> bool {
    let endpoint = format!("{host}:{port}");
    let Ok(mut addrs) = endpoint.to_socket_addrs() else {
        return false;
    };

    addrs.any(|addr| can_connect(addr))
}

fn can_connect(addr: SocketAddr) -> bool {
    std::net::TcpStream::connect_timeout(&addr, Duration::from_millis(250)).is_ok()
}

pub fn find_free_port(host: &str, start: u16) -> Option<u16> {
    for port in start..=start.saturating_add(100) {
        if TcpListener::bind((host, port)).is_ok() {
            return Some(port);
        }
    }
    None
}

pub fn app_url(host: &str, port: u16) -> String {
    format!("http://{host}:{port}/")
}

pub fn health_url(host: &str, port: u16) -> String {
    format!("http://{host}:{port}/api/health")
}

pub fn is_pixelanea_healthy(host: &str, port: u16) -> bool {
    let url = health_url(host, port);
    ureq::get(&url)
        .call()
        .map(|response| response.status() == 200)
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_free_port_near_start() {
        let host = "127.0.0.1";
        let port = find_free_port(host, 49152).expect("expected a free port");
        assert!(port >= 49152);
        assert!(TcpListener::bind((host, port)).is_ok());
    }
}
