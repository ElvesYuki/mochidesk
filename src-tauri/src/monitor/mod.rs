#[derive(Debug, Clone, Copy)]
pub struct MonitorSnapshot {
    pub cpu_load: Option<f32>,
    pub memory_load: Option<f32>,
}

pub fn placeholder_snapshot() -> MonitorSnapshot {
    MonitorSnapshot {
        cpu_load: None,
        memory_load: None,
    }
}
