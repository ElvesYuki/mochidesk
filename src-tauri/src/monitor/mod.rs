use std::sync::Mutex;

use serde::Serialize;
use sysinfo::System;

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MonitorSnapshot {
    pub cpu_load: Option<f32>,
    pub memory_load: Option<f32>,
    pub source: &'static str,
}

pub struct MonitorState {
    system: Mutex<System>,
}

impl MonitorState {
    pub fn new() -> Self {
        let mut system = System::new();
        system.refresh_cpu_usage();
        system.refresh_memory();

        Self {
            system: Mutex::new(system),
        }
    }

    pub fn snapshot(&self) -> Result<MonitorSnapshot, &'static str> {
        let mut system = self
            .system
            .lock()
            .map_err(|_| "failed to lock system monitor state")?;

        system.refresh_cpu_usage();
        system.refresh_memory();

        let total_memory = system.total_memory();
        let used_memory = system.used_memory();

        Ok(MonitorSnapshot {
            cpu_load: Some(normalize_ratio(system.global_cpu_usage() / 100.0)),
            memory_load: (total_memory > 0)
                .then_some(normalize_ratio(used_memory as f32 / total_memory as f32)),
            source: "native",
        })
    }
}

fn normalize_ratio(value: f32) -> f32 {
    value.clamp(0.0, 1.0)
}
