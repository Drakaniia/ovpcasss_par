//! Remembered accounts in the OS credential store (report 5).
//!
//! The shell used to keep one plaintext token under the bundle identifier. It
//! now keeps a small JSON collection so more than one account can sign in and
//! switch without typing a password again. Nothing here touches the keyring:
//! every rule is pure and unit tested, and `lib.rs` only reads and writes the
//! resulting string.

use serde::{Deserialize, Serialize};

pub const STORE_VERSION: u32 = 1;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Account {
    pub id: String,
    pub name: String,
    pub email: String,
    pub token: String,
}

#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct Accounts {
    pub version: u32,
    /// The account whose token the running webview is using.
    pub active: Option<String>,
    pub accounts: Vec<Account>,
}

/// What the profile card may see: names and emails, never a token.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountSummary {
    pub id: String,
    pub name: String,
    pub email: String,
    pub active: bool,
}

impl Accounts {
    fn normalised(mut self) -> Self {
        self.version = STORE_VERSION;

        // A store whose active id points nowhere falls back to the first account.
        if !self.accounts.iter().any(|account| Some(&account.id) == self.active.as_ref()) {
            self.active = self.accounts.first().map(|account| account.id.clone());
        }

        self
    }
}

/// Parses the stored string. A pre-multi-account value is a bare token, which is
/// wrapped as the one saved account so an upgrade stays signed in.
pub fn parse(raw: Option<&str>) -> Accounts {
    let Some(value) = raw.map(str::trim).filter(|value| !value.is_empty()) else {
        return Accounts::default();
    };

    match serde_json::from_str::<Accounts>(value) {
        Ok(accounts) if accounts.version == STORE_VERSION => accounts.normalised(),
        _ => Accounts {
            version: STORE_VERSION,
            active: Some("legacy".to_string()),
            accounts: vec![Account {
                id: "legacy".to_string(),
                name: "Saved account".to_string(),
                email: String::new(),
                token: value.to_string(),
            }],
        },
    }
}

/// Adds or updates an account and makes it the active one.
pub fn upsert(mut accounts: Accounts, account: Account) -> Accounts {
    match accounts.accounts.iter_mut().find(|entry| entry.id == account.id) {
        Some(entry) => *entry = account.clone(),
        None => accounts.accounts.push(account.clone()),
    }

    accounts.active = Some(account.id);
    accounts.normalised()
}

/// Makes another saved account active and returns its token.
pub fn switch(mut accounts: Accounts, id: &str) -> (Accounts, Option<String>) {
    let token = accounts
        .accounts
        .iter()
        .find(|account| account.id == id)
        .map(|account| account.token.clone());

    if token.is_some() {
        accounts.active = Some(id.to_string());
    }

    (accounts.normalised(), token)
}

pub fn active_token(accounts: &Accounts) -> Option<String> {
    accounts
        .active
        .as_ref()
        .and_then(|id| accounts.accounts.iter().find(|account| &account.id == id))
        .map(|account| account.token.clone())
}

/// Forgets one account; the active marker moves to whatever remains.
pub fn forget(mut accounts: Accounts, id: &str) -> Accounts {
    accounts.accounts.retain(|account| account.id != id);
    if accounts.active.as_deref() == Some(id) {
        accounts.active = None;
    }

    accounts.normalised()
}

/// Updates the metadata of the active account after `/me` resolves.
pub fn remember(accounts: Accounts, id: &str, name: &str, email: &str) -> Accounts {
    let mut next = accounts;
    if let Some(account) = next.accounts.iter_mut().find(|account| account.id == id) {
        account.name = name.to_string();
        account.email = email.to_string();
    }

    next.normalised()
}

pub fn summaries(accounts: &Accounts) -> Vec<AccountSummary> {
    accounts
        .accounts
        .iter()
        .map(|account| AccountSummary {
            id: account.id.clone(),
            name: if account.name.is_empty() {
                account.email.clone()
            } else {
                account.name.clone()
            },
            email: account.email.clone(),
            active: Some(&account.id) == accounts.active.as_ref(),
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn account(id: &str, token: &str) -> Account {
        Account {
            id: id.to_string(),
            name: format!("Person {id}"),
            email: format!("{id}@buksu.edu.ph"),
            token: token.to_string(),
        }
    }

    #[test]
    fn a_legacy_token_stays_signed_in() {
        let accounts = parse(Some("opaque-token"));

        assert_eq!(active_token(&accounts).as_deref(), Some("opaque-token"));
        assert_eq!(accounts.accounts.len(), 1);
    }

    #[test]
    fn empty_or_missing_values_have_no_accounts() {
        assert_eq!(parse(None), Accounts::default());
        assert_eq!(parse(Some("   ")), Accounts::default());
    }

    #[test]
    fn a_corrupt_store_is_treated_as_a_legacy_token() {
        let accounts = parse(Some("{not json"));
        assert_eq!(accounts.accounts[0].token, "{not json");
    }

    #[test]
    fn adding_an_account_makes_it_active_without_losing_the_first() {
        let accounts = upsert(parse(None), account("u1", "t1"));

        assert_eq!(accounts.active.as_deref(), Some("u1"));
        assert_eq!(summaries(&accounts)[0].active, true);
    }

    #[test]
    fn switching_returns_the_token_and_moves_the_marker() {
        let accounts = upsert(upsert(parse(None), account("u1", "t1")), account("u2", "t2"));
        let (switched, token) = switch(accounts, "u1");

        assert_eq!(token.as_deref(), Some("t1"));
        assert_eq!(active_token(&switched).as_deref(), Some("t1"));
    }

    #[test]
    fn switching_to_an_unknown_account_changes_nothing() {
        let accounts = upsert(parse(None), account("u1", "t1"));
        let (switched, token) = switch(accounts, "nope");

        assert_eq!(token, None);
        assert_eq!(switched.active.as_deref(), Some("u1"));
    }

    #[test]
    fn forgetting_the_active_account_promotes_the_next() {
        let accounts = upsert(upsert(parse(None), account("u1", "t1")), account("u2", "t2"));
        let next = forget(accounts, "u2");

        assert_eq!(next.accounts.len(), 1);
        assert_eq!(next.active.as_deref(), Some("u1"));
    }

    #[test]
    fn remembering_a_name_never_touches_a_token() {
        let accounts = remember(upsert(parse(None), account("u1", "t1")), "u1", "M. Santos", "ms@x");
        let summary = &summaries(&accounts)[0];

        assert_eq!(summary.name, "M. Santos");
        assert_eq!(accounts.accounts[0].token, "t1");
    }

    #[test]
    fn a_summary_never_contains_a_token() {
        let accounts = upsert(parse(None), account("u1", "secret"));

        assert!(!serde_json::to_string(&summaries(&accounts)).unwrap().contains("secret"));
    }
}
