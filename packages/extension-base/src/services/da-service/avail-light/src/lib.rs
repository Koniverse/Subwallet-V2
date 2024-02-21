pub mod proof;
pub mod types;

use crate::proof::verify;
use crate::types::{Cell, Position};
use dusk_plonk::prelude::PublicParameters;
use once_cell::sync::Lazy;
use std::{collections::HashMap, sync::Mutex};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    // #[wasm_bindgen(js_namespace = console)]
    // fn log(s: u16);
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: Vec<u8>);
}

#[wasm_bindgen]
pub fn check(proof: Vec<u8>, commitment: Vec<u8>, width: u16, row: u32, col: u16) -> bool {
    //let commitments = from_slice(&commitment).unwrap();
    //log(commitment.clone());
    //log(proof.clone());
    let cell = Cell {
        position: Position { row, col },
        content: proof.try_into().unwrap(),
    };
    let kate_commitment = commitment.try_into().unwrap();

    let pp = public_params();
    return verify(&pp, width, &kate_commitment, &cell).unwrap();
}

static SRS_DATA: Lazy<Mutex<HashMap<usize, PublicParameters>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));
pub fn public_params2(max_degree: usize) -> PublicParameters {
    let mut srs_data_locked = SRS_DATA.lock().unwrap();
    srs_data_locked
        .entry(max_degree)
        .or_insert_with(|| {
            use rand_chacha::{rand_core::SeedableRng as _, ChaChaRng};

            let mut rng = ChaChaRng::seed_from_u64(42);
            PublicParameters::setup(max_degree, &mut rng).unwrap()
        })
        .clone()
}

pub fn public_params() -> PublicParameters {
    let pp_bytes = include_bytes!("pp_1024.data");
    PublicParameters::from_slice(pp_bytes)
        .expect("Deserialising of public parameters should work for serialised pp")
}
