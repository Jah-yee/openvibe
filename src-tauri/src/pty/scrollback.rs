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
    dirty: bool,
}

impl Scrollback {
    pub fn new(capacity: usize) -> Self {
        Self {
            buf: VecDeque::new(),
            capacity,
            truncated: false,
            dirty: false,
        }
    }

    pub fn push(&mut self, bytes: &[u8]) {
        if bytes.is_empty() {
            return;
        }
        self.dirty = true;
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
    /// to the first newline (or, in a screen redrawn without newlines, to the first
    /// escape sequence) and reset attributes before the rest.
    pub fn snapshot(&self) -> Vec<u8> {
        let data: Vec<u8> = self.buf.iter().copied().collect();
        if !self.truncated {
            return data;
        }
        let start = match data.iter().position(|&b| b == b'\n') {
            Some(newline) => newline + 1,
            None => data.iter().position(|&b| b == 0x1b).unwrap_or(0),
        };
        let mut out = Vec::with_capacity(RESET_ATTRIBUTES.len() + data.len() - start);
        out.extend_from_slice(RESET_ATTRIBUTES);
        out.extend_from_slice(&data[start..]);
        out
    }

    /// True once per batch of new output; lets the periodic flusher skip idle terminals.
    pub fn take_dirty(&mut self) -> bool {
        std::mem::replace(&mut self.dirty, false)
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
    fn replays_whole_buffer_when_truncated_without_newline_or_escape() {
        let mut sb = Scrollback::new(4);
        sb.push(b"abcdefgh");
        assert_eq!(sb.snapshot(), b"\x1b[0mefgh");
    }

    #[test]
    fn skips_a_cut_escape_sequence_when_there_is_no_newline() {
        let mut sb = Scrollback::new(10);
        // The kept tail is "1mcd\x1b[0mef": "1m" is the end of a cut "\x1b[31m".
        sb.push(b"ab\x1b[31mcd\x1b[0mef");
        assert_eq!(sb.snapshot(), b"\x1b[0m\x1b[0mef");
    }

    #[test]
    fn empty_buffer_snapshot_is_empty() {
        let mut sb = Scrollback::new(4);
        sb.push(b"");
        assert!(sb.snapshot().is_empty());
    }

    #[test]
    fn dirty_flag_is_set_by_output_and_cleared_on_take() {
        let mut sb = Scrollback::new(8);
        assert!(!sb.take_dirty());
        sb.push(b"");
        assert!(!sb.take_dirty());
        sb.push(b"x");
        assert!(sb.take_dirty());
        assert!(!sb.take_dirty());
    }
}
