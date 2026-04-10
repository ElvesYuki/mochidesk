use std::{
    collections::{HashMap, VecDeque},
    net::{SocketAddr, UdpSocket},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::remote_skill::RemoteSkillRun;

const LAN_PROTOCOL_VERSION: u8 = 1;
const DEFAULT_UDP_PORT: u16 = 39457;
const RECEIVE_BUFFER_SIZE: usize = 4096;
const PEER_STALE_AFTER_MS: u64 = 15_000;
const MAX_RECENT_EVENTS: usize = 32;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LanMessage {
    pub version: u8,
    #[serde(rename = "type")]
    pub message_type: String,
    pub sender_id: String,
    pub sender_name: String,
    pub timestamp: u64,
    #[serde(default)]
    pub payload: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LanPeer {
    pub id: String,
    pub name: String,
    pub address: String,
    pub port: u16,
    pub last_seen_at: u64,
    pub status: String,
    pub activity: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkEvent {
    pub direction: String,
    pub address: String,
    pub port: u16,
    pub message: LanMessage,
    pub received_at: u64,
}

struct ListenerHandle {
    stop_flag: Arc<AtomicBool>,
    join_handle: thread::JoinHandle<()>,
    port: u16,
}

pub struct NetworkState {
    peers: Arc<Mutex<HashMap<String, LanPeer>>>,
    recent_events: Arc<Mutex<Vec<NetworkEvent>>>,
    pending_remote_skill_requests: Arc<Mutex<VecDeque<serde_json::Value>>>,
    listener: Mutex<Option<ListenerHandle>>,
    local_identity: LocalIdentity,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalIdentity {
    pub sender_id: String,
    pub sender_name: String,
}

impl NetworkState {
    pub fn new() -> Self {
        Self {
            peers: Arc::new(Mutex::new(HashMap::new())),
            recent_events: Arc::new(Mutex::new(Vec::new())),
            pending_remote_skill_requests: Arc::new(Mutex::new(VecDeque::new())),
            listener: Mutex::new(None),
            local_identity: LocalIdentity {
                sender_id: format!("mochi-{}", current_timestamp_ms()),
                sender_name: "MochiDesk".to_string(),
            },
        }
    }

    pub fn start_listener(&self, requested_port: Option<u16>) -> Result<u16, String> {
        let port = requested_port.unwrap_or(DEFAULT_UDP_PORT);
        let mut listener_guard = self
            .listener
            .lock()
            .map_err(|_| "failed to lock listener state".to_string())?;

        if let Some(active) = listener_guard.as_ref() {
            return Ok(active.port);
        }

        let socket = UdpSocket::bind(("0.0.0.0", port))
            .map_err(|error| format!("failed to bind UDP listener on {port}: {error}"))?;
        socket
            .set_broadcast(true)
            .map_err(|error| format!("failed to enable UDP broadcast: {error}"))?;
        socket
            .set_nonblocking(true)
            .map_err(|error| format!("failed to set UDP listener nonblocking: {error}"))?;

        let listener_socket = socket
            .try_clone()
            .map_err(|error| format!("failed to clone UDP listener socket: {error}"))?;
        let peers = Arc::clone(&self.peers);
        let recent_events = Arc::clone(&self.recent_events);
        let pending_remote_skill_requests = Arc::clone(&self.pending_remote_skill_requests);
        let local_identity = self.local_identity.clone();
        let stop_flag = Arc::new(AtomicBool::new(false));
        let thread_stop_flag = Arc::clone(&stop_flag);

        let join_handle = thread::spawn(move || {
            let mut buffer = [0_u8; RECEIVE_BUFFER_SIZE];

            while !thread_stop_flag.load(Ordering::Relaxed) {
                match listener_socket.recv_from(&mut buffer) {
                    Ok((received_len, address)) => {
                        let Ok(text) = std::str::from_utf8(&buffer[..received_len]) else {
                            continue;
                        };

                        let Ok(message) = serde_json::from_str::<LanMessage>(text) else {
                            continue;
                        };

                        if !is_supported_message(&message) {
                            continue;
                        }

                        if is_message_from_local_listener(&message, port, &local_identity.sender_id) {
                            continue;
                        }

                        register_peer(&peers, &message, address);
                        push_network_event(&recent_events, "incoming", address, message.clone());
                        if message.message_type == "deploy_announce" {
                            push_pending_remote_skill_request(
                                &pending_remote_skill_requests,
                                message.payload.clone(),
                            );
                        }

                        if message.message_type == "hello" {
                            let ack_message = create_ack_message(&message, port, &local_identity);
                            let _ = send_message_with_socket(
                                &socket,
                                &ack_message,
                                address,
                                &recent_events,
                            );
                        }
                    }
                    Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                        cleanup_stale_peers(&peers);
                        thread::sleep(Duration::from_millis(120));
                    }
                    Err(_) => {
                        thread::sleep(Duration::from_millis(180));
                    }
                }
            }
        });

        *listener_guard = Some(ListenerHandle {
            stop_flag,
            join_handle,
            port,
        });

        Ok(port)
    }

    pub fn stop_listener(&self) -> Result<(), String> {
        let mut listener_guard = self
            .listener
            .lock()
            .map_err(|_| "failed to lock listener state".to_string())?;

        let Some(listener) = listener_guard.take() else {
            return Ok(());
        };

        listener.stop_flag.store(true, Ordering::Relaxed);
        listener
            .join_handle
            .join()
            .map_err(|_| "failed to join UDP listener thread".to_string())?;

        Ok(())
    }

    pub fn get_known_peers(&self) -> Result<Vec<LanPeer>, String> {
        cleanup_stale_peers(&self.peers);

        let peers = self
            .peers
            .lock()
            .map_err(|_| "failed to lock peer registry".to_string())?;
        let mut result = peers.values().cloned().collect::<Vec<_>>();
        result.sort_by(|left, right| right.last_seen_at.cmp(&left.last_seen_at));
        Ok(result)
    }

    pub fn get_recent_events(&self) -> Result<Vec<NetworkEvent>, String> {
        let events = self
            .recent_events
            .lock()
            .map_err(|_| "failed to lock network events".to_string())?;
        Ok(events.clone())
    }

    pub fn dequeue_remote_skill_request(&self) -> Result<Option<serde_json::Value>, String> {
        let mut queue = self
            .pending_remote_skill_requests
            .lock()
            .map_err(|_| "failed to lock remote skill request queue".to_string())?;
        Ok(queue.pop_front())
    }

    pub fn get_remote_skill_status_messages(&self) -> Result<Vec<RemoteSkillRun>, String> {
        let events = self.get_recent_events()?;
        let mut runs = Vec::new();

        for event in events {
            if matches!(
                event.message.message_type.as_str(),
                "deploy_ack" | "deploy_progress" | "deploy_result"
            ) {
                if let Ok(mut run) =
                    serde_json::from_value::<RemoteSkillRun>(event.message.payload.clone())
                {
                    if run.updated_at == 0 {
                        run.updated_at = event.received_at;
                    }
                    runs.push(run);
                }
            }
        }

        Ok(runs)
    }

    pub fn get_local_identity(&self) -> LocalIdentity {
        self.local_identity.clone()
    }

    pub fn broadcast_message(
        &self,
        mut message: LanMessage,
        requested_port: Option<u16>,
    ) -> Result<(), String> {
        let port = requested_port.unwrap_or(DEFAULT_UDP_PORT);
        message.version = LAN_PROTOCOL_VERSION;
        message.timestamp = current_timestamp_ms();
        message.payload = sanitize_payload(message.payload, port);

        send_message_to_socket(
            &message,
            SocketAddr::from(([255, 255, 255, 255], port)),
            &self.recent_events,
        )
    }

    pub fn send_message(&self, target: &str, mut message: LanMessage) -> Result<(), String> {
        let address = target
            .parse::<SocketAddr>()
            .map_err(|error| format!("failed to parse target address '{target}': {error}"))?;
        message.version = LAN_PROTOCOL_VERSION;
        message.timestamp = current_timestamp_ms();
        message.payload = sanitize_payload(message.payload, address.port());
        send_message_to_socket(&message, address, &self.recent_events)
    }
}

impl Drop for NetworkState {
    fn drop(&mut self) {
        let _ = self.stop_listener();
    }
}

fn is_supported_message(message: &LanMessage) -> bool {
    if message.version != LAN_PROTOCOL_VERSION {
        return false;
    }

    if message.sender_id.trim().is_empty() || message.sender_name.trim().is_empty() {
        return false;
    }

    matches!(
        message.message_type.as_str(),
        "hello"
            | "hello_ack"
            | "heartbeat"
            | "status"
            | "interaction"
            | "request"
            | "deploy_announce"
            | "deploy_ack"
            | "deploy_progress"
            | "deploy_result"
            | "bye"
    )
}

fn is_message_from_local_listener(
    message: &LanMessage,
    listen_port: u16,
    local_sender_id: &str,
) -> bool {
    let payload_port = message
        .payload
        .get("listenPort")
        .and_then(serde_json::Value::as_u64)
        .and_then(|value| u16::try_from(value).ok());

    payload_port == Some(listen_port) && message.sender_id == local_sender_id
}

fn create_ack_message(
    message: &LanMessage,
    listen_port: u16,
    identity: &LocalIdentity,
) -> LanMessage {
    LanMessage {
        version: LAN_PROTOCOL_VERSION,
        message_type: "hello_ack".to_string(),
        sender_id: identity.sender_id.clone(),
        sender_name: identity.sender_name.clone(),
        timestamp: current_timestamp_ms(),
        payload: json!({
            "activity": "idle",
            "listenPort": listen_port,
            "replyTo": message.sender_id,
        }),
    }
}

fn sanitize_payload(payload: serde_json::Value, listen_port: u16) -> serde_json::Value {
    let mut object = payload.as_object().cloned().unwrap_or_default();
    object.insert("listenPort".to_string(), json!(listen_port));
    serde_json::Value::Object(object)
}

fn send_message_to_socket(
    message: &LanMessage,
    address: SocketAddr,
    recent_events: &Arc<Mutex<Vec<NetworkEvent>>>,
) -> Result<(), String> {
    let socket = UdpSocket::bind(("0.0.0.0", 0))
        .map_err(|error| format!("failed to bind UDP sender socket: {error}"))?;
    socket
        .set_broadcast(true)
        .map_err(|error| format!("failed to enable UDP sender broadcast: {error}"))?;

    send_message_with_socket(&socket, message, address, recent_events)
}

fn send_message_with_socket(
    socket: &UdpSocket,
    message: &LanMessage,
    address: SocketAddr,
    recent_events: &Arc<Mutex<Vec<NetworkEvent>>>,
) -> Result<(), String> {
    let text = serde_json::to_string(message)
        .map_err(|error| format!("failed to serialize UDP message: {error}"))?;
    socket
        .send_to(text.as_bytes(), address)
        .map_err(|error| format!("failed to send UDP message: {error}"))?;

    push_network_event(recent_events, "outgoing", address, message.clone());

    Ok(())
}

fn register_peer(
    peers: &Arc<Mutex<HashMap<String, LanPeer>>>,
    message: &LanMessage,
    address: SocketAddr,
) {
    let activity = message
        .payload
        .get("activity")
        .and_then(serde_json::Value::as_str)
        .unwrap_or("idle")
        .to_string();
    let reported_port = message
        .payload
        .get("listenPort")
        .and_then(serde_json::Value::as_u64)
        .and_then(|value| u16::try_from(value).ok())
        .unwrap_or(address.port());

    if let Ok(mut peers) = peers.lock() {
        peers.insert(
            message.sender_id.clone(),
            LanPeer {
                id: message.sender_id.clone(),
                name: message.sender_name.clone(),
                address: address.ip().to_string(),
                port: reported_port,
                last_seen_at: current_timestamp_ms(),
                status: "online".to_string(),
                activity,
            },
        );
    }
}

fn cleanup_stale_peers(peers: &Arc<Mutex<HashMap<String, LanPeer>>>) {
    let stale_before = current_timestamp_ms().saturating_sub(PEER_STALE_AFTER_MS);

    if let Ok(mut peers) = peers.lock() {
        peers.retain(|_, peer| peer.last_seen_at >= stale_before);
    }
}

fn push_network_event(
    recent_events: &Arc<Mutex<Vec<NetworkEvent>>>,
    direction: &str,
    address: SocketAddr,
    message: LanMessage,
) {
    if let Ok(mut events) = recent_events.lock() {
        events.push(NetworkEvent {
            direction: direction.to_string(),
            address: address.ip().to_string(),
            port: address.port(),
            message,
            received_at: current_timestamp_ms(),
        });

        if events.len() > MAX_RECENT_EVENTS {
            let overflow = events.len() - MAX_RECENT_EVENTS;
            events.drain(0..overflow);
        }
    }
}

fn push_pending_remote_skill_request(
    pending_requests: &Arc<Mutex<VecDeque<serde_json::Value>>>,
    payload: serde_json::Value,
) {
    if let Ok(mut queue) = pending_requests.lock() {
        queue.push_back(payload);

        if queue.len() > 32 {
            queue.pop_front();
        }
    }
}

fn current_timestamp_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
