// contracts/vault/src/lib.rs
// Issue #1345 — Multi-Vault Secure Batch Withdrawal
//
// Exposes VaultContract with two batch entry points:
//
//   batch_withdraw        — soft-failure mode: individual request failures are
//                           recorded as outcomes without aborting the batch.
//   batch_withdraw_strict — hard-failure mode: pre-flight verifies all token
//                           allocations before any state is touched; panics if
//                           any single owner would be over-drawn.
//
// See batch.rs for the full atomicity model and gas optimisation notes.

#![no_std]

pub mod batch;

use batch::{process_batch, process_batch_strict, WithdrawalOutcome, WithdrawalRequest};
use soroban_sdk::{contract, contractimpl, Address, Env, Vec};

/// Soroban smart contract managing individual vault balances and batch withdrawals.
#[contract]
pub struct VaultContract;

#[contractimpl]
impl VaultContract {
    /// Deposits token funds into the specified owner's vault balance.
    ///
    /// # Arguments
    /// * `env`    — The Soroban environment context.
    /// * `owner`  — Address of the vault owner; must authorise this call.
    /// * `amount` — Amount to deposit in base units. Must be strictly positive.
    ///
    /// # Panics
    /// * If `amount <= 0` (message: `"deposit amount must be positive"`).
    ///
    /// # Gas notes
    /// One persistent storage read + one write + one TTL bump per call.
    pub fn deposit(env: Env, owner: Address, amount: i128) {
        owner.require_auth();
        assert!(amount > 0, "deposit amount must be positive");
        let current = Self::read_balance(&env, &owner);
        Self::write_balance(&env, &owner, current + amount);
    }

    /// Executes a batch of withdrawal requests — soft-failure mode.
    ///
    /// Each request is evaluated independently. Invalid or underfunded requests
    /// produce a `WithdrawalOutcome { success: false, failure_code }` entry
    /// without aborting earlier successful requests.
    ///
    /// Prefer `batch_withdraw_strict` when you need all-or-nothing guarantees.
    ///
    /// # Arguments
    /// * `env`      — The Soroban environment context.
    /// * `requests` — Ordered list of withdrawal instructions (must be non-empty).
    ///
    /// # Returns
    /// `Vec<WithdrawalOutcome>` — one entry per request, in the same order.
    ///
    /// # Panics
    /// * `BatchError::EmptyBatch` — `requests` is empty.
    /// * `BatchError::ArithmeticOverflow` — balance arithmetic overflows `i128`.
    ///
    /// # Gas notes
    /// Single invocation handles N withdrawals: O(N) storage reads/writes.
    /// TTL bumps are embedded in the read/write helpers — no extra ops.
    pub fn batch_withdraw(
        env: Env,
        requests: Vec<WithdrawalRequest>,
    ) -> Vec<WithdrawalOutcome> {
        process_batch(
            &env,
            requests,
            |e, addr| Self::read_balance(e, addr),
            |e, addr, bal| Self::write_balance(e, addr, bal),
        )
    }

    /// Executes a batch of withdrawal requests — strict / all-or-nothing mode.
    ///
    /// Runs a pre-flight token allocation check across the full request list
    /// before executing any state change. If any owner would be over-drawn
    /// when all their requests are aggregated, the entire call panics with
    /// `BatchError::PreflightFailed` and no storage is modified.
    ///
    /// Use this entry point when correctness matters more than partial throughput.
    ///
    /// # Arguments
    /// * `env`      — The Soroban environment context.
    /// * `requests` — Ordered list of withdrawal instructions (must be non-empty).
    ///
    /// # Returns
    /// `Vec<WithdrawalOutcome>` — all entries will have `success: true` if the
    /// call does not panic.
    ///
    /// # Panics
    /// * `BatchError::EmptyBatch`        — `requests` is empty.
    /// * `BatchError::PreflightFailed`   — at least one owner would be over-drawn.
    /// * `BatchError::ArithmeticOverflow` — total amounts overflow `i128`.
    pub fn batch_withdraw_strict(
        env: Env,
        requests: Vec<WithdrawalRequest>,
    ) -> Vec<WithdrawalOutcome> {
        process_batch_strict(
            &env,
            requests,
            |e, addr| Self::read_balance(e, addr),
            |e, addr, bal| Self::write_balance(e, addr, bal),
        )
    }

    /// Returns the current vault balance for the specified owner.
    ///
    /// Read-only; no authentication required.  Returns `0` when no record
    /// exists.  TTL is bumped on read to prevent expiry of live balances.
    pub fn balance(env: Env, owner: Address) -> i128 {
        Self::read_balance(&env, &owner)
    }

    // ── Internal storage helpers ──────────────────────────────────────────────

    fn balance_key(owner: &Address) -> (soroban_sdk::Symbol, Address) {
        (soroban_sdk::symbol_short!("bal"), owner.clone())
    }

    /// Read balance and bump TTL to prevent silent expiry on active vaults.
    fn read_balance(env: &Env, owner: &Address) -> i128 {
        let key = Self::balance_key(owner);
        let bal = env
            .storage()
            .persistent()
            .get::<_, i128>(&key)
            .unwrap_or(0);
        // Bump on read: ensures that a balance that has not been written for a
        // while does not expire just because no withdrawal was made.
        if bal != 0 {
            env.storage()
                .persistent()
                .extend_ttl(&key, 100, 518_400);
        }
        bal
    }

    /// Write balance and bump TTL — single storage op, single TTL op.
    ///
    /// TTL target of 518_400 ledgers ≈ 30 days at ~5 s/ledger.
    /// Threshold of 100 means a bump is skipped only when the key will live
    /// for more than 100 ledgers from now, avoiding wasteful duplicate bumps.
    fn write_balance(env: &Env, owner: &Address, amount: i128) {
        let key = Self::balance_key(owner);
        env.storage().persistent().set(&key, &amount);
        env.storage()
            .persistent()
            .extend_ttl(&key, 100, 518_400);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use batch::{FailureReason, WithdrawalRequest};
    use soroban_sdk::{testutils::Address as _, vec, Env};

    fn setup() -> (Env, soroban_sdk::Address, VaultContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register_contract(None, VaultContract);
        let client = VaultContractClient::new(&env, &id);
        (env, id, client)
    }

    #[test]
    fn deposit_and_balance() {
        let (env, _, client) = setup();
        let owner = Address::generate(&env);
        client.deposit(&owner, &1000);
        assert_eq!(client.balance(&owner), 1000);
    }

    #[test]
    fn batch_withdraw_deducts_all() {
        let (env, _, client) = setup();
        let a = Address::generate(&env);
        let b = Address::generate(&env);
        let recipient = Address::generate(&env);

        client.deposit(&a, &500);
        client.deposit(&b, &300);

        let requests = vec![
            &env,
            WithdrawalRequest { owner: a.clone(), recipient: recipient.clone(), amount: 200 },
            WithdrawalRequest { owner: b.clone(), recipient: recipient.clone(), amount: 100 },
        ];

        let outcomes = client.batch_withdraw(&requests);
        assert_eq!(outcomes.len(), 2);
        assert!(outcomes.get(0).unwrap().success);
        assert!(outcomes.get(1).unwrap().success);
        assert_eq!(client.balance(&a), 300);
        assert_eq!(client.balance(&b), 200);
    }

    #[test]
    fn batch_withdraw_records_insufficient_balance_as_failure() {
        let (env, _, client) = setup();
        let owner = Address::generate(&env);
        let recipient = Address::generate(&env);
        client.deposit(&owner, &50);

        let requests = vec![
            &env,
            WithdrawalRequest { owner: owner.clone(), recipient, amount: 100 },
        ];
        let outcomes = client.batch_withdraw(&requests);
        assert_eq!(outcomes.len(), 1);
        let outcome = outcomes.get(0).unwrap();
        assert!(!outcome.success);
        assert_eq!(outcome.failure_code, FailureReason::InsufficientBalance as u32);
        // Balance unchanged.
        assert_eq!(client.balance(&owner), 50);
    }

    #[test]
    fn batch_withdraw_skips_zero_amount_request() {
        let (env, _, client) = setup();
        let owner = Address::generate(&env);
        let recipient = Address::generate(&env);
        client.deposit(&owner, &500);

        let requests = vec![
            &env,
            WithdrawalRequest { owner: owner.clone(), recipient, amount: 0 },
        ];
        let outcomes = client.batch_withdraw(&requests);
        assert_eq!(outcomes.len(), 1);
        let outcome = outcomes.get(0).unwrap();
        assert!(!outcome.success);
        assert_eq!(outcome.failure_code, FailureReason::ZeroOrNegativeAmount as u32);
        assert_eq!(client.balance(&owner), 500);
    }

    #[test]
    fn batch_withdraw_happy_path_full_flow() {
        let (env, _, client) = setup();
        let owner = Address::generate(&env);
        let recipient = Address::generate(&env);

        client.deposit(&owner, &1000);

        let requests = vec![
            &env,
            WithdrawalRequest { owner: owner.clone(), recipient: recipient.clone(), amount: 400 },
        ];

        let outcomes = client.batch_withdraw(&requests);
        assert_eq!(outcomes.len(), 1);
        let outcome = outcomes.get(0).unwrap();
        assert!(outcome.success);
        assert_eq!(outcome.owner, owner);
        assert_eq!(outcome.amount, 400);
        assert_eq!(outcome.failure_code, 0); // FailureReason::None
        assert_eq!(client.balance(&owner), 600);
    }

    #[test]
    fn batch_withdraw_mixed_success_and_failure() {
        let (env, _, client) = setup();
        let rich = Address::generate(&env);
        let poor = Address::generate(&env);
        let recipient = Address::generate(&env);

        client.deposit(&rich, &1000);
        // poor has no balance

        let requests = vec![
            &env,
            WithdrawalRequest { owner: rich.clone(), recipient: recipient.clone(), amount: 500 },
            WithdrawalRequest { owner: poor.clone(), recipient: recipient.clone(), amount: 100 },
        ];

        let outcomes = client.batch_withdraw(&requests);
        assert_eq!(outcomes.len(), 2);

        // Rich withdrawal succeeds.
        assert!(outcomes.get(0).unwrap().success);
        assert_eq!(client.balance(&rich), 500);

        // Poor withdrawal fails softly — rich balance is still correctly debited.
        assert!(!outcomes.get(1).unwrap().success);
        assert_eq!(
            outcomes.get(1).unwrap().failure_code,
            FailureReason::InsufficientBalance as u32
        );
        assert_eq!(client.balance(&poor), 0);
    }

    #[test]
    #[should_panic]
    fn batch_withdraw_strict_panics_on_over_allocation() {
        let (env, _, client) = setup();
        let owner = Address::generate(&env);
        let recipient = Address::generate(&env);
        client.deposit(&owner, &300);

        // Two requests totalling 400 against a balance of 300 — pre-flight fails.
        let requests = vec![
            &env,
            WithdrawalRequest { owner: owner.clone(), recipient: recipient.clone(), amount: 200 },
            WithdrawalRequest { owner: owner.clone(), recipient: recipient.clone(), amount: 200 },
        ];
        client.batch_withdraw_strict(&requests); // must panic
    }

    #[test]
    fn batch_withdraw_strict_succeeds_when_allocation_is_valid() {
        let (env, _, client) = setup();
        let owner = Address::generate(&env);
        let recipient = Address::generate(&env);
        client.deposit(&owner, &500);

        let requests = vec![
            &env,
            WithdrawalRequest { owner: owner.clone(), recipient: recipient.clone(), amount: 200 },
            WithdrawalRequest { owner: owner.clone(), recipient: recipient.clone(), amount: 200 },
        ];
        let outcomes = client.batch_withdraw_strict(&requests);
        assert_eq!(outcomes.len(), 2);
        assert!(outcomes.get(0).unwrap().success);
        assert!(outcomes.get(1).unwrap().success);
        assert_eq!(client.balance(&owner), 100);
    }
}
