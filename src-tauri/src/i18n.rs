//! The interface's language, told by the frontend (spec première version
//! §7.1), for the messages Rust shows or sends: `tr!("…", "…")`.

use std::sync::atomic::{AtomicBool, Ordering};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Lang {
    Fr,
    En,
}

impl Lang {
    /// What the frontend sends; anything else is French, the language of before.
    pub fn parse(text: &str) -> Lang {
        if text == "en" { Lang::En } else { Lang::Fr }
    }
}

static ENGLISH: AtomicBool = AtomicBool::new(false);

pub fn set(lang: Lang) {
    ENGLISH.store(lang == Lang::En, Ordering::Relaxed);
}

pub fn current() -> Lang {
    if ENGLISH.load(Ordering::Relaxed) {
        Lang::En
    } else {
        Lang::Fr
    }
}

/// `tr!("Dossier introuvable : {path}", "Folder not found: {path}")`: the
/// interface's language, formatted with the caller's variables.
#[macro_export]
macro_rules! tr {
    ($fr:literal, $en:literal) => {
        match $crate::i18n::current() {
            $crate::i18n::Lang::Fr => format!($fr),
            $crate::i18n::Lang::En => format!($en),
        }
    };
}

#[tauri::command]
pub fn set_language(lang: String) {
    set(Lang::parse(&lang));
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_what_the_frontend_sends() {
        assert_eq!(Lang::parse("en"), Lang::En);
        assert_eq!(Lang::parse("fr"), Lang::Fr);
        assert_eq!(Lang::parse("de"), Lang::Fr);
    }

    #[test]
    fn formats_with_the_callers_variables() {
        // Tests share the language: this one only reads it (French by default).
        let path = "C:/x";
        assert_eq!(
            tr!("Dossier introuvable : {path}", "Folder not found: {path}"),
            "Dossier introuvable : C:/x"
        );
    }
}
