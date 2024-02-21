use core::{
    convert::TryInto,
    fmt::{Display, Formatter, Result},
};

// TODO: Constants are copy from kate crate, we should move them to common place
pub const CHUNK_SIZE: usize = 32;
pub const DATA_CHUNK_SIZE: usize = 31;
pub const PADDING_TAIL_VALUE: u8 = 0x80;
pub const COMMITMENT_SIZE: usize = 48;
pub const EXTENSION_FACTOR: usize = 2;

pub struct Position {
    pub row: u32,
    pub col: u16,
}

impl<R, C> From<(R, C)> for Position
where
    u32: From<R>,
    u16: From<C>,
{
    fn from(row_col: (R, C)) -> Self {
        Self {
            row: row_col.0.into(),
            col: row_col.1.into(),
        }
    }
}

impl<R, C> From<Position> for (R, C)
where
    R: From<u32>,
    C: From<u16>,
{
    fn from(p: Position) -> (R, C) {
        (p.row.into(), p.col.into())
    }
}

impl Display for Position {
    fn fmt(&self, f: &mut Formatter<'_>) -> Result {
        f.write_fmt(format_args!("{}:{}", self.col, self.row))
    }
}

impl Position {
    /// Checks if position is from extended row
    pub fn is_extended(&self) -> bool {
        self.row % 2 == 1
    }
}

/// Position and content of a cell in extended matrix
pub struct Cell {
    /// Cell's position
    pub position: Position,
    /// Cell's data
    pub content: [u8; 80],
}

impl Cell {
    pub fn data(&self) -> [u8; 32] {
        self.content[48..].try_into().expect("content is 80 bytes")
    }

    pub fn proof(&self) -> [u8; 48] {
        self.content[..48].try_into().expect("content is 80 bytes")
    }
}
