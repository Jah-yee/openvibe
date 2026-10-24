//! A command typed into a terminal as a paste (spec habillage §15.3): wrapped
//! in bracketed paste when the program asked for it, so an agent takes several
//! lines as one message, then validated with Enter.

use std::time::Duration;

/// Enter follows the paste after this delay: an agent that reads both at once
/// may take the Enter as part of the paste.
pub const ENTER_DELAY: Duration = Duration::from_millis(30);

const MODE_ON: &[u8] = b"\x1b[?2004h";
const MODE_OFF: &[u8] = b"\x1b[?2004l";
const PASTE_START: &str = "\x1b[200~";
const PASTE_END: &str = "\x1b[201~";

/// The program's bracketed paste mode, followed in its output (ConPTY forwards
/// `ESC[?2004h` and `ESC[?2004l`). A switch may be split across two reads.
#[derive(Debug, Default)]
pub struct PasteMode {
    on: bool,
    tail: Vec<u8>,
}

impl PasteMode {
    pub fn feed(&mut self, chunk: &[u8]) {
        let mut data = std::mem::take(&mut self.tail);
        data.extend_from_slice(chunk);
        match (find_last(&data, MODE_ON), find_last(&data, MODE_OFF)) {
            (Some(on), Some(off)) => self.on = on > off,
            (Some(_), None) => self.on = true,
            (None, Some(_)) => self.on = false,
            (None, None) => {}
        }
        // Shorter than a whole switch, so none is ever counted twice.
        let keep = data.len().min(MODE_ON.len() - 1);
        self.tail = data.split_off(data.len() - keep);
    }

    pub fn is_on(&self) -> bool {
        self.on
    }
}

fn find_last(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    haystack
        .windows(needle.len())
        .rposition(|window| window == needle)
}

/// What is written for `text`: line breaks as Enter (`\r`, as xterm does for a
/// paste), inside paste markers when `bracketed`. Markers found in the text are
/// dropped, then every escape and control character but tabs and line breaks:
/// a marker would end the paste early and type the rest as keys, and removing
/// one can glue the pieces of another back together.
pub fn paste_payload(text: &str, bracketed: bool) -> Vec<u8> {
    let clean: String = text
        .replace(PASTE_START, "")
        .replace(PASTE_END, "")
        .replace("\r\n", "\r")
        .replace('\n', "\r")
        .chars()
        .filter(|c| !c.is_control() || matches!(c, '\t' | '\r'))
        .collect();
    if bracketed {
        format!("{PASTE_START}{clean}{PASTE_END}").into_bytes()
    } else {
        clean.into_bytes()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn follows_the_mode_even_when_a_switch_is_split_across_reads() {
        let mut mode = PasteMode::default();
        assert!(!mode.is_on());
        mode.feed(b"prompt\x1b[?20");
        assert!(!mode.is_on());
        mode.feed(b"04h> ");
        assert!(mode.is_on());
        mode.feed(b"bye\x1b[?2004l");
        assert!(!mode.is_on());
        // Within one read, the last switch wins.
        mode.feed(b"\x1b[?2004hx\x1b[?2004ly\x1b[?2004h");
        assert!(mode.is_on());
        mode.feed(b"plain output");
        assert!(mode.is_on());
    }

    #[test]
    fn wraps_the_text_only_when_the_program_asked_for_it() {
        assert_eq!(
            paste_payload("lance\nles tests", true),
            b"\x1b[200~lance\rles tests\x1b[201~"
        );
        assert_eq!(paste_payload("a\r\nb", false), b"a\rb");
        assert_eq!(paste_payload("continue", false), b"continue");
    }

    #[test]
    fn drops_paste_markers_found_in_the_text() {
        assert_eq!(
            paste_payload("x\x1b[201~rm\x1b[200~y", true),
            b"\x1b[200~xrmy\x1b[201~"
        );
        // Removing the inner marker must not rebuild an end marker around it.
        assert_eq!(
            paste_payload("x\x1b[20\x1b[201~1~rm -rf ~\ny", true),
            b"\x1b[200~x[201~rm -rf ~\ry\x1b[201~"
        );
        // No escape nor control key reaches the program; tabs and lines stay.
        assert_eq!(paste_payload("a\x03b\tc\x7f", false), b"ab\tc");
    }
}
