use std::collections::VecDeque;

/// Per-terminal cap on retained output (spec §5.6).
pub const SCROLLBACK_CAPACITY: usize = 512 * 1024;

/// SGR reset, prepended when replaying a truncated buffer so colors left open by
/// dropped output don't bleed into the restored screen.
const RESET_ATTRIBUTES: &[u8] = b"\x1b[0m";

/// Ring buffer of the most recent raw PTY output, replayed when a terminal is
/// re-attached or restored after a restart.
pub struct Scrollback {
    buf: VecDeque<u8>,
    capacity: usize,
    truncated: bool,
}

impl Scrollback {
    pub fn new(capacity: usize) -> Self {
        Self {
            buf: VecDeque::new(),
            capacity,
            truncated: false,
        }
    }

    pub fn push(&mut self, bytes: &[u8]) {
        if bytes.len() >= self.capacity {
            self.buf.clear();
            self.buf.extend(&bytes[bytes.len() - self.capacity..]);
            self.truncated = true;
            return;
        }
        let overflow = (self.buf.len() + bytes.len()).saturating_sub(self.capacity);
        if overflow > 0 {
            self.buf.drain(..overflow);
            self.truncated = true;
        }
        self.buf.extend(bytes);
    }

    /// Bytes that are safe to write into a fresh terminal. Once old output has been
    /// dropped the buffer may begin in the middle of an escape sequence, so we skip
    /// to the first newline and reset attributes before the rest.
    pub fn snapshot(&self) -> Vec<u8> {
        let data: Vec<u8> = self.buf.iter().copied().collect();
        if !self.truncated {
            return data;
        }
        let start = data.iter().position(|&b| b == b'\n').map_or(0, |i| i + 1);
        let mut out = Vec::with_capacity(RESET_ATTRIBUTES.len() + data.len() - start);
        out.extend_from_slice(RESET_ATTRIBUTES);
        out.extend_from_slice(&data[start..]);
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_everything_below_capacity() {
        let mut sb = Scrollback::new(16);
        sb.push(b"hello ");
        sb.push(b"world");
        assert_eq!(sb.snapshot(), b"hello world");
    }

    #[test]
    fn drops_oldest_bytes_and_replays_from_first_newline() {
        let mut sb = Scrollback::new(10);
        sb.push(b"\x1b[31mred\nline2\n");
        // 15 bytes into 10: the color escape is dropped, "red\nline2\n" is kept.
        assert_eq!(sb.snapshot(), b"\x1b[0mline2\n");
    }

    #[test]
    fn keeps_the_tail_of_a_chunk_larger_than_capacity() {
        let mut sb = Scrollback::new(4);
        sb.push(b"abcdef\ngh");
        assert_eq!(sb.snapshot(), b"\x1b[0mgh");
    }

    #[test]
    fn replays_whole_buffer_when_truncated_without_newline() {
        let mut sb = Scrollback::new(4);
        sb.push(b"abcdefgh");
        assert_eq!(sb.snapshot(), b"\x1b[0mefgh");
    }

    #[test]
    fn empty_buffer_snapshot_is_empty() {
        let mut sb = Scrollback::new(4);
        sb.push(b"");
        assert!(sb.snapshot().is_empty());
    }
}
