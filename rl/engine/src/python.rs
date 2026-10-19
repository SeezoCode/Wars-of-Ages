//! Python bindings: `import wars_engine`.
//!
//! ```python
//! env = wars_engine.VecEnv(64, dqn_model="ultimate_dqn_model.json")
//! env.reset(0, "agent", "classic", seed=1)        # per-env reset: agent | classic | dqn
//! obs, mask = env.observe()                       # (N,2,OBS) float32, (N,2,A) bool — both sides, ego-centric
//! obs, mask, rew, done, winner, time = env.step(actions)   # actions: (N,2) int64
//! ```
//! `rew` holds raw per-side reward components (see `env::NUM_REWARD_COMPONENTS`);
//! `winner` is -1 (running), 0 (left won), 1 (right won), 2 (draw / timeout).

use std::sync::Arc;

use numpy::{PyArray1, PyArrayMethods, PyReadonlyArray2, PyUntypedArrayMethods};
use pyo3::exceptions::PyValueError;
use pyo3::prelude::*;
use pyo3::types::PyDict;

use crate::dqn::DqnNet;
use crate::env::{EnvConfig, Kind, VecEnv, NUM_REWARD_COMPONENTS};
use crate::obs::{NUM_ACTIONS, OBS_SIZE};
use crate::troops::{NUM_TROOPS, TROOPS};

type Arrays<'py> = (Bound<'py, PyAny>, Bound<'py, PyAny>);

#[pyclass(name = "VecEnv", module = "wars_engine")]
struct PyVecEnv {
    inner: VecEnv,
}

fn reshape<'py, T: numpy::Element>(py: Python<'py>, data: &[T], shape: &[usize]) -> PyResult<Bound<'py, PyAny>> {
    Ok(PyArray1::from_slice(py, data).reshape(shape)?.into_any())
}

impl PyVecEnv {
    fn arrays<'py>(&self, py: Python<'py>) -> PyResult<Arrays<'py>> {
        let n = self.inner.envs.len();
        Ok((reshape(py, &self.inner.obs, &[n, 2, OBS_SIZE])?, reshape(py, &self.inner.mask, &[n, 2, NUM_ACTIONS])?))
    }
}

#[pymethods]
impl PyVecEnv {
    #[new]
    #[pyo3(signature = (num_envs, decision_interval=10, max_ticks=36000, start_money=55.0, agent_max_units=10,
                        classic_max_units=7, dqn_max_units=10, nuke_freeze_ticks=45, worker_latency=1,
                        worker_unit_ticks_per_frame=60000.0, dqn_model=None, threads=0, max_upgrades=-1))]
    #[allow(clippy::too_many_arguments)]
    fn new(
        num_envs: usize,
        decision_interval: i64,
        max_ticks: i64,
        start_money: f64,
        agent_max_units: usize,
        classic_max_units: usize,
        dqn_max_units: usize,
        nuke_freeze_ticks: i64,
        worker_latency: i64,
        worker_unit_ticks_per_frame: f64,
        dqn_model: Option<String>,
        threads: usize,
        max_upgrades: i64,
    ) -> PyResult<Self> {
        let dqn = match dqn_model {
            Some(p) => Some(Arc::new(DqnNet::from_file(&p).map_err(PyValueError::new_err)?)),
            None => None,
        };
        let cfg = EnvConfig {
            decision_interval,
            max_ticks,
            start_money,
            agent_max_units,
            classic_max_units,
            dqn_max_units,
            nuke_freeze_ticks,
            worker_latency,
            worker_unit_ticks_per_frame,
            // negative = unlimited (the game's rule)
            max_upgrades: if max_upgrades < 0 { u32::MAX } else { max_upgrades.min(u32::MAX as i64) as u32 },
        };
        Ok(PyVecEnv { inner: VecEnv::new(num_envs, cfg, dqn, threads) })
    }

    #[getter]
    fn num_envs(&self) -> usize {
        self.inner.envs.len()
    }

    /// Start a new game in env `i`. `left` / `right`: "agent" | "classic" | "dqn".
    fn reset(&mut self, i: usize, left: &str, right: &str, seed: u64) -> PyResult<()> {
        if i >= self.inner.envs.len() {
            return Err(PyValueError::new_err("env index out of range"));
        }
        let l = Kind::parse(left).map_err(PyValueError::new_err)?;
        let r = Kind::parse(right).map_err(PyValueError::new_err)?;
        let env = &mut self.inner.envs[i];
        env.reset(seed, l, r).map_err(PyValueError::new_err)?;
        let o = &mut self.inner.obs[i * 2 * OBS_SIZE..(i + 1) * 2 * OBS_SIZE];
        let m = &mut self.inner.mask[i * 2 * NUM_ACTIONS..(i + 1) * 2 * NUM_ACTIONS];
        env.observe(o, m);
        Ok(())
    }

    /// Copy games: env `dst[k]` becomes a copy of `src` env `src_idx[k]` (another VecEnv), then
    /// optionally reseeded (`seeds[k]` >= 0) and with sides handed to the agent (`agent_sides[k]`:
    /// 0 none, 1 left, 2 right, 3 both). Used by the search: the copies are played out and thrown away.
    fn copy_from(&mut self, dst: Vec<usize>, src: PyRef<'_, PyVecEnv>, src_idx: Vec<usize>, seeds: Vec<i64>,
                 agent_sides: Vec<u8>) -> PyResult<()> {
        let n = self.inner.envs.len();
        if dst.len() != src_idx.len() || dst.len() != seeds.len() || dst.len() != agent_sides.len() {
            return Err(PyValueError::new_err("dst, src_idx, seeds and agent_sides must have the same length"));
        }
        for k in 0..dst.len() {
            let (d, s) = (dst[k], src_idx[k]);
            if d >= n || s >= src.inner.envs.len() {
                return Err(PyValueError::new_err("env index out of range"));
            }
            let mut e = src.inner.envs[s].clone();
            if seeds[k] >= 0 {
                e.reseed(seeds[k] as u64);
            }
            for p in 0..2 {
                if agent_sides[k] & (1 << p) != 0 {
                    e.make_agent(p);
                }
            }
            self.inner.envs[d] = e;
        }
        for &d in &dst {  // only the copied envs: the review's history buffer holds thousands
            let o = &mut self.inner.obs[d * 2 * OBS_SIZE..(d + 1) * 2 * OBS_SIZE];
            let m = &mut self.inner.mask[d * 2 * NUM_ACTIONS..(d + 1) * 2 * NUM_ACTIONS];
            self.inner.envs[d].observe(o, m);
        }
        Ok(())
    }

    /// Current observations and action masks: ((N,2,OBS) float32, (N,2,A) bool).
    fn observe<'py>(&self, py: Python<'py>) -> PyResult<Arrays<'py>> {
        self.arrays(py)
    }

    /// Step all running envs. Returns (obs, mask, rew_components, done, winner, time).
    #[allow(clippy::type_complexity)]
    fn step<'py>(
        &mut self,
        py: Python<'py>,
        actions: PyReadonlyArray2<'py, i64>,
    ) -> PyResult<(Bound<'py, PyAny>, Bound<'py, PyAny>, Bound<'py, PyAny>, Bound<'py, PyAny>, Bound<'py, PyAny>, Bound<'py, PyAny>)> {
        let n = self.inner.envs.len();
        if actions.shape() != [n, 2] {
            return Err(PyValueError::new_err(format!("actions must have shape ({n}, 2)")));
        }
        let a = actions.as_slice()?;
        let acts: Vec<[usize; 2]> = (0..n).map(|i| [a[2 * i].max(0) as usize, a[2 * i + 1].max(0) as usize]).collect();
        let inner = &mut self.inner;
        py.detach(|| inner.step(&acts));
        let (obs, mask) = self.arrays(py)?;
        let flat: Vec<f32> = self.inner.rew.iter().flat_map(|r| r.iter().flat_map(|s| s.iter().copied())).collect();
        let rew = reshape(py, &flat, &[n, 2, NUM_REWARD_COMPONENTS])?;
        let done: Vec<bool> = self.inner.envs.iter().map(|e| e.done).collect();
        let winner: Vec<i8> = self.inner.envs.iter().map(|e| e.winner).collect();
        let time: Vec<i64> = self.inner.envs.iter().map(|e| e.game.time).collect();
        Ok((obs, mask, rew, reshape(py, &done, &[n])?, reshape(py, &winner, &[n])?, reshape(py, &time, &[n])?))
    }

    /// Compact state of env `i` for logging: per side [money, base_health, multiplier, count of each troop type].
    fn snapshot(&self, i: usize) -> PyResult<Vec<Vec<f64>>> {
        let e = self.inner.envs.get(i).ok_or_else(|| PyValueError::new_err("env index out of range"))?;
        Ok(e.game
            .players
            .iter()
            .map(|pl| {
                let mut v = vec![pl.money, pl.base.health, pl.multiplier];
                let mut counts = [0f64; NUM_TROOPS];
                for u in &pl.units {
                    counts[u.kind] += 1.0;
                }
                v.extend_from_slice(&counts);
                v
            })
            .collect())
    }

    /// Human-readable state of env `i` (for debugging / logging).
    fn info<'py>(&self, py: Python<'py>, i: usize) -> PyResult<Bound<'py, PyDict>> {
        let e = self.inner.envs.get(i).ok_or_else(|| PyValueError::new_err("env index out of range"))?;
        let d = PyDict::new(py);
        d.set_item("time", e.game.time)?;
        d.set_item("done", e.done)?;
        d.set_item("winner", e.winner)?;
        d.set_item("atomic_doom", e.game.atomic_doom)?;
        for (p, name) in [(0usize, "left"), (1usize, "right")] {
            let pl = &e.game.players[p];
            let pd = PyDict::new(py);
            pd.set_item("money", pl.money)?;
            pd.set_item("base_health", pl.base.health)?;
            pd.set_item("multiplier", pl.multiplier)?;
            pd.set_item("unlocked", pl.unlocked.to_vec())?;
            let units: Vec<(String, f64, f64)> =
                pl.units.iter().map(|u| (TROOPS[u.kind].name.to_string(), u.position, u.health)).collect();
            pd.set_item("units", units)?;
            pd.set_item("upgrades", pl.upgrades)?;
            pd.set_item("spawned", pl.stats.spawned.to_vec())?;
            pd.set_item("lost", pl.stats.lost.to_vec())?;
            pd.set_item("researched_at", pl.stats.researched_at.to_vec())?;
            pd.set_item("upgrade_times", pl.stats.upgrade_times.clone())?;
            pd.set_item("damage_dealt", pl.damage_dealt)?;
            pd.set_item("spending", pl.spending)?;
            pd.set_item("bounty_earned", pl.bounty_earned)?;
            d.set_item(name, pd)?;
        }
        Ok(d)
    }
}

fn action_names() -> Vec<String> {
    let mut v: Vec<String> = TROOPS.iter().map(|t| t.name.to_string()).collect();
    v.extend(TROOPS.iter().map(|t| format!("Research {}", t.name)));
    v.push("Upgrade +20%".into());
    v.push("wait".into());
    v
}

#[pymodule]
fn wars_engine(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_class::<PyVecEnv>()?;
    m.add("OBS_SIZE", OBS_SIZE)?;
    m.add("NUM_ACTIONS", NUM_ACTIONS)?;
    m.add("NUM_REWARD_COMPONENTS", NUM_REWARD_COMPONENTS)?;
    m.add("ACTION_NAMES", action_names())?;
    m.add("TROOP_NAMES", TROOPS.iter().map(|t| t.name.to_string()).collect::<Vec<_>>())?;
    m.add("REWARD_COMPONENTS", vec!["enemy_base_damage", "own_base_damage", "bounty_earned", "bounty_given"])?;
    Ok(())
}
