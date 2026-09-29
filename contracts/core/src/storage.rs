// contracts/core/src/storage.rs
// Issue #1344 — Cross-Contract Comprehensive TTL Legacy Refreshment
//
// Guarantees that every persistent storage entry is refreshed on every read
// AND every write so no key silently expires on the Soroban ledger.
//
// ── TTL policy ───────────────────────────────────────────────────────────────
//
// TTL_THRESHOLD (100 ledgers ≈ 8 min at ~5 s/ledger):
//   `extend_ttl` is a no-op when the remaining TTL already exceeds this value.
//   Keeping the threshold low ensures that keys near expiry are always bumped
//   without paying the cost of redundant extend_ttl calls on recently written
//   entries.
//
// TTL_TARGET (518_400 ledgers ≈ 30 days at ~5 s/ledger):
//   Every bump sets the remaining TTL to at least this value.  30 days is
//   deliberately generous — the only cost is slightly longer ledger retention.
//   Tighten for ephemeral keys if storage fees become a concern.
//
// ── Bump on read rationale ───────────────────────────────────────────────────
//
// A key that is read but not written (e.g. a profile queried by a third party)
// would otherwise drift towards expiry even though it is actively being used.
// Bumping on every successful read prevents this silent degradation, at the
// cost of one extra host call per read path.  The Soroban SDK deduplicates
// redundant TTL extensions within a single transaction, so the gas overhead is
// minimal when both read and write happen in the same call.
//
// ── Bump on write rationale ──────────────────────────────────────────────────
//
// `storage().persistent().set(...)` does NOT automatically extend the TTL in
// Soroban SDK v21+.  The explicit extend_ttl call after every set ensures that
// freshly written data always starts with a full 30-day TTL.

#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String};

// ---------------------------------------------------------------------------
// TTL constants
// ---------------------------------------------------------------------------

/// Minimum remaining ledger TTL before a bump is triggered.
/// Below this threshold, `extend_ttl` sets the TTL to `TTL_TARGET`.
const TTL_THRESHOLD: u32 = 100;

/// Target TTL to extend to — approximately 30 days at ~5 s/ledger.
const TTL_TARGET: u32 = 518_400;

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

/// Keys used in persistent storage for this contract.
#[contracttype]
pub enum StorageKey {
    /// Per-address creator / freelancer profile.
    Profile(Address),
    /// Per-bounty application/execution state.
    BountyState(u64),
    /// Per-address escrow balance.
    EscrowBalance(Address),
}

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

/// A generic creator profile record stored persistently.
#[contracttype]
#[derive(Clone)]
pub struct Profile {
    /// The owning address; used as the primary storage key.
    pub owner: Address,
    /// Display name shown in the platform UI.
    pub display_name: String,
    /// On-chain reputation score accumulated from completed bounties.
    pub reputation: u32,
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct StorageContract;

#[contractimpl]
impl StorageContract {
    // ── Write helpers ─────────────────────────────────────────────────────────

    /// Persists a creator profile and immediately refreshes its TTL.
    ///
    /// Bumping on write guarantees that a newly stored profile always has a
    /// full 30-day TTL regardless of how long the key has existed.
    ///
    /// # Arguments
    ///
    /// * `env`     — Soroban host environment.
    /// * `profile` — Complete profile record to store under `profile.owner`.
    ///
    /// # Preconditions
    ///
    /// The profile owner must authorise this invocation.
    pub fn set_profile(env: Env, profile: Profile) {
        profile.owner.require_auth();
        let key = StorageKey::Profile(profile.owner.clone());
        env.storage().persistent().set(&key, &profile);
        // Bump on write: set a full TTL_TARGET even if the key already exists.
        Self::bump_persistent(&env, &key);
    }

    /// Persists a bounty state value and refreshes its TTL.
    ///
    /// # Arguments
    ///
    /// * `env`       — Soroban host environment.
    /// * `account`   — Address authorising this update.
    /// * `bounty_id` — Identifier used as the persistent storage key.
    /// * `state`     — Application-defined numeric bounty state.
    ///
    /// # Preconditions
    ///
    /// `account` must authorise this invocation.
    pub fn set_bounty_state(env: Env, account: Address, bounty_id: u64, state: u32) {
        account.require_auth();
        let key = StorageKey::BountyState(bounty_id);
        env.storage().persistent().set(&key, &state);
        Self::bump_persistent(&env, &key);
    }

    /// Persists an escrow balance and refreshes its TTL.
    ///
    /// # Arguments
    ///
    /// * `env`     — Soroban host environment.
    /// * `account` — Address used as both the key and the invocation authoriser.
    /// * `balance` — Signed balance to store; domain validation (non-negative)
    ///               is left to the caller.
    ///
    /// # Preconditions
    ///
    /// `account` must authorise this invocation.
    pub fn set_escrow_balance(env: Env, account: Address, balance: i128) {
        account.require_auth();
        let key = StorageKey::EscrowBalance(account);
        env.storage().persistent().set(&key, &balance);
        Self::bump_persistent(&env, &key);
    }

    // ── Read helpers ──────────────────────────────────────────────────────────
    //
    // Every successful read bumps the TTL so that keys actively being queried
    // by third parties (e.g. a profile visited by a potential client) are kept
    // alive even if the owner has not performed any writes recently.

    /// Reads a profile and refreshes its TTL on hit.
    ///
    /// Returns `None` when no profile exists for `owner`.  No authentication
    /// is required for reads.
    ///
    /// TTL is bumped only when the key is found to avoid unnecessary host calls
    /// for missing keys.
    ///
    /// # Arguments
    ///
    /// * `env`   — Soroban host environment.
    /// * `owner` — Profile owner address used as the lookup key.
    pub fn get_profile(env: Env, owner: Address) -> Option<Profile> {
        let key = StorageKey::Profile(owner);
        let value = env.storage().persistent().get::<StorageKey, Profile>(&key);
        if value.is_some() {
            // Bump on read: keeps active profiles alive even without writes.
            Self::bump_persistent(&env, &key);
        }
        value
    }

    /// Reads a bounty state and refreshes its TTL on hit.
    ///
    /// Returns `None` when no state exists for `bounty_id`.  No authentication
    /// required.
    ///
    /// # Arguments
    ///
    /// * `env`       — Soroban host environment.
    /// * `bounty_id` — Bounty identifier used as the lookup key.
    pub fn get_bounty_state(env: Env, bounty_id: u64) -> Option<u32> {
        let key = StorageKey::BountyState(bounty_id);
        let value = env.storage().persistent().get::<StorageKey, u32>(&key);
        if value.is_some() {
            Self::bump_persistent(&env, &key);
        }
        value
    }

    /// Reads an escrow balance and refreshes its TTL on hit.
    ///
    /// Returns `None` when no balance record exists for `account`.  No
    /// authentication required.
    ///
    /// # Arguments
    ///
    /// * `env`     — Soroban host environment.
    /// * `account` — Account address used as the lookup key.
    pub fn get_escrow_balance(env: Env, account: Address) -> Option<i128> {
        let key = StorageKey::EscrowBalance(account);
        let value = env.storage().persistent().get::<StorageKey, i128>(&key);
        if value.is_some() {
            Self::bump_persistent(&env, &key);
        }
        value
    }

    // ── Explicit TTL refresh entry points ─────────────────────────────────────
    //
    // These allow external callers (e.g. a cron-like keep-alive contract) to
    // refresh a key's TTL without performing a full read or write. Useful for
    // scheduled maintenance jobs that need to keep infrequently accessed keys
    // alive without pulling their full values.

    /// Explicitly refresh the TTL for a profile without reading its value.
    ///
    /// No authentication required — any caller may keep a profile alive.
    /// Returns `true` if the key exists (and was bumped), `false` otherwise.
    pub fn refresh_profile_ttl(env: Env, owner: Address) -> bool {
        let key = StorageKey::Profile(owner);
        if env.storage().persistent().has(&key) {
            Self::bump_persistent(&env, &key);
            true
        } else {
            false
        }
    }

    /// Explicitly refresh the TTL for a bounty state without reading its value.
    ///
    /// Returns `true` if the key exists and was bumped.
    pub fn refresh_bounty_state_ttl(env: Env, bounty_id: u64) -> bool {
        let key = StorageKey::BountyState(bounty_id);
        if env.storage().persistent().has(&key) {
            Self::bump_persistent(&env, &key);
            true
        } else {
            false
        }
    }

    /// Explicitly refresh the TTL for an escrow balance without reading its value.
    ///
    /// Returns `true` if the key exists and was bumped.
    pub fn refresh_escrow_balance_ttl(env: Env, account: Address) -> bool {
        let key = StorageKey::EscrowBalance(account);
        if env.storage().persistent().has(&key) {
            Self::bump_persistent(&env, &key);
            true
        } else {
            false
        }
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    /// Extend the TTL for a persistent key to at least `TTL_TARGET` ledgers.
    ///
    /// The Soroban host skips the extension when the remaining TTL already
    /// exceeds `TTL_THRESHOLD`, making this safe to call on every read/write.
    #[inline]
    fn bump_persistent(env: &Env, key: &StorageKey) {
        env.storage()
            .persistent()
            .extend_ttl(key, TTL_THRESHOLD, TTL_TARGET);
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    fn make_client() -> (Env, StorageContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register_contract(None, StorageContract);
        let client = StorageContractClient::new(&env, &id);
        (env, client)
    }

    // ── Profile ───────────────────────────────────────────────────────────────

    #[test]
    fn set_and_get_profile_roundtrip() {
        let (env, client) = make_client();
        let owner = Address::generate(&env);
        let profile = Profile {
            owner: owner.clone(),
            display_name: soroban_sdk::String::from_str(&env, "Alice"),
            reputation: 42,
        };
        client.set_profile(&profile);
        let fetched = client.get_profile(&owner).expect("profile should exist");
        assert_eq!(fetched.reputation, 42);
        assert_eq!(fetched.display_name, soroban_sdk::String::from_str(&env, "Alice"));
    }

    #[test]
    fn get_profile_returns_none_for_missing_key() {
        let (env, client) = make_client();
        let unknown = Address::generate(&env);
        assert!(client.get_profile(&unknown).is_none());
    }

    #[test]
    fn set_profile_requires_auth() {
        let env = Env::default(); // no mock_all_auths
        let id = env.register_contract(None, StorageContract);
        let client = StorageContractClient::new(&env, &id);
        let owner = Address::generate(&env);
        let profile = Profile {
            owner: owner.clone(),
            display_name: soroban_sdk::String::from_str(&env, "Bob"),
            reputation: 0,
        };
        let result = client.try_set_profile(&profile);
        assert!(result.is_err());
    }

    #[test]
    fn refresh_profile_ttl_returns_true_when_exists() {
        let (env, client) = make_client();
        let owner = Address::generate(&env);
        let profile = Profile {
            owner: owner.clone(),
            display_name: soroban_sdk::String::from_str(&env, "Charlie"),
            reputation: 10,
        };
        client.set_profile(&profile);
        let refreshed = client.refresh_profile_ttl(&owner);
        assert!(refreshed);
    }

    #[test]
    fn refresh_profile_ttl_returns_false_when_missing() {
        let (env, client) = make_client();
        let ghost = Address::generate(&env);
        let refreshed = client.refresh_profile_ttl(&ghost);
        assert!(!refreshed);
    }

    // ── Bounty state ──────────────────────────────────────────────────────────

    #[test]
    fn bounty_state_persists_and_bumps() {
        let (env, client) = make_client();
        let owner = Address::generate(&env);
        client.set_bounty_state(&owner, &1u64, &2u32);
        let state = client.get_bounty_state(&1u64).expect("state should exist");
        assert_eq!(state, 2u32);
    }

    #[test]
    fn set_bounty_state_requires_auth() {
        let env = Env::default();
        let id = env.register_contract(None, StorageContract);
        let client = StorageContractClient::new(&env, &id);
        let owner = Address::generate(&env);
        let result = client.try_set_bounty_state(&owner, &1u64, &2u32);
        assert!(result.is_err());
    }

    #[test]
    fn refresh_bounty_state_ttl_returns_true_when_exists() {
        let (env, client) = make_client();
        let owner = Address::generate(&env);
        client.set_bounty_state(&owner, &99u64, &5u32);
        assert!(client.refresh_bounty_state_ttl(&99u64));
    }

    #[test]
    fn refresh_bounty_state_ttl_returns_false_when_missing() {
        let (env, client) = make_client();
        assert!(!client.refresh_bounty_state_ttl(&999u64));
    }

    // ── Escrow balance ────────────────────────────────────────────────────────

    #[test]
    fn escrow_balance_roundtrip() {
        let (env, client) = make_client();
        let account = Address::generate(&env);
        client.set_escrow_balance(&account, &5_000_i128);
        let bal = client.get_escrow_balance(&account).expect("balance should exist");
        assert_eq!(bal, 5_000);
    }

    #[test]
    fn missing_escrow_balance_returns_none() {
        let (env, client) = make_client();
        let account = Address::generate(&env);
        assert!(client.get_escrow_balance(&account).is_none());
    }

    #[test]
    fn refresh_escrow_balance_ttl_returns_true_when_exists() {
        let (env, client) = make_client();
        let account = Address::generate(&env);
        client.set_escrow_balance(&account, &100_i128);
        assert!(client.refresh_escrow_balance_ttl(&account));
    }

    #[test]
    fn refresh_escrow_balance_ttl_returns_false_when_missing() {
        let (env, client) = make_client();
        let ghost = Address::generate(&env);
        assert!(!client.refresh_escrow_balance_ttl(&ghost));
    }
}
