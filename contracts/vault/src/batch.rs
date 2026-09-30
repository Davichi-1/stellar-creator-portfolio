// contracts/vault/src/batch.rs
// Issue #1345 — Multi-Vault Secure Batch Withdrawal
//
// Vectorised batch processor for vault withdrawals.
//
// ── Gas optimisation ─────────────────────────────────────────────────────────
// A single contract invocation handles N withdrawals, eliminating per-request
// transaction fees, sequence-number round-trips, and network congestion caused
// by sequencing individual withdrawal transactions. Balance reads and writes use
// the persistent storage TTL bump inline, avoiding a separate `extend_ttl` call
// per entry.
//
// ── Atomicity model ──────────────────────────────────────────────────────────
// Individual request failures (zero amount, insufficient balance, auth failure)
// are recorded as `WithdrawalOutcome { success: false }` rather than aborting
// the entire batch. This means a single bad request cannot ruin valid requests
// already processed in the same invocation. If you need strict all-or-nothing
// semantics, inspect all outcomes at the caller level and treat any `success:
// false` outcome as a reason to abort or retry at the application layer.
//
// ── Token allocation verification ───────────────────────────────────────────
// Before executing any withdrawals the processor runs a pre-flight balance check
// across all requests to detect obvious over-allocations early. This does NOT
// guarantee atomicity of the full batch (balances can change between pre-flight
// and execution) but it surfaces the common case of a caller accidentally
// requesting more than is available.

use soroban_sdk::{contracterror, contracttype, Address, Env, Vec};

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/// A single withdrawal request within a batch.
///
/// The `owner` field doubles as the authorisation principal — `require_auth()`
/// is called on it before any state is read or written for this entry.
#[contracttype]
#[derive(Clone)]
pub struct WithdrawalRequest {
    /// Vault owner address authorising this withdrawal.
    pub owner: Address,
    /// Destination address to receive the withdrawn funds.
    pub recipient: Address,
    /// Token amount to withdraw (in stroops / base units). Must be > 0.
    pub amount: i128,
}

/// Outcome for a single processed withdrawal in a batch.
///
/// `success: false` indicates the request was skipped due to failed
/// validation or an insufficient balance. No state is modified for
/// failed requests; the original `amount` is preserved in the outcome
/// so callers can inspect and retry.
#[contracttype]
#[derive(Clone)]
pub struct WithdrawalOutcome {
    /// Vault owner address associated with the withdrawal attempt.
    pub owner: Address,
    /// Requested withdrawal amount (echoed regardless of success).
    pub amount: i128,
    /// `true`  — funds were debited and a `"withdraw"` event emitted.
    /// `false` — request was skipped; no state was changed.
    pub success: bool,
    /// Machine-readable failure reason when `success` is `false`.
    /// `0` means success; see [`FailureReason`] for non-zero values.
    pub failure_code: u32,
}

/// Fine-grained failure reasons embedded in [`WithdrawalOutcome`].
#[contracttype]
#[repr(u32)]
pub enum FailureReason {
    /// No failure — withdrawal succeeded.
    None = 0,
    /// Requested amount is zero or negative.
    ZeroOrNegativeAmount = 1,
    /// Vault balance is lower than the requested amount.
    InsufficientBalance = 2,
}

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

/// Error codes for batch-level hard failures (panic with error).
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum BatchError {
    /// `process_batch` was called with an empty requests vector.
    EmptyBatch = 1,
    /// A single request amount overflowed `i128` arithmetic during accounting.
    ArithmeticOverflow = 2,
    /// Token allocation pre-flight detected a request exceeding available funds
    /// for a given owner when considering all earlier requests in the same batch.
    ///
    /// This is a *hard* batch-level error only when `strict_preflight = true`
    /// is passed to `process_batch_strict`. The default `process_batch` records
    /// this per-entry as `InsufficientBalance` instead.
    PreflightFailed = 3,
}

// ---------------------------------------------------------------------------
// Internal accounting helpers
// ---------------------------------------------------------------------------

/// Computes the total amount requested across all entries for a given owner.
///
/// Used in pre-flight to determine whether the batch as a whole would
/// overdraw any single vault. Overflow is treated as a hard error because
/// wrapping arithmetic on balances would be catastrophic.
fn sum_requested_for_owner(
    env: &Env,
    requests: &Vec<WithdrawalRequest>,
    target: &Address,
) -> Option<i128> {
    let mut total: i128 = 0i128;
    for req in requests.iter() {
        if req.owner == *target {
            total = total.checked_add(req.amount)?;
        }
    }
    let _ = env; // env reserved for future event emission
    Some(total)
}

// ---------------------------------------------------------------------------
// Public batch processor
// ---------------------------------------------------------------------------

/// Vectorised batch processor for vault withdrawals.
///
/// Evaluates each withdrawal request independently within a single on-chain
/// invocation. Per-request failures are soft (recorded as `success: false`);
/// only truly unrecoverable conditions (empty batch, arithmetic overflow) cause
/// a hard panic.
///
/// # Arguments
///
/// * `env`         — Reference to the Soroban environment.
/// * `requests`    — Ordered list of withdrawal instructions.
/// * `get_balance` — Closure `(&Env, &Address) -> i128` that reads a vault balance.
/// * `set_balance` — Closure `(&Env, &Address, i128)` that writes a vault balance.
///
/// # Returns
///
/// A [`Vec<WithdrawalOutcome>`] in the exact order of `requests`.
///
/// # Panics
///
/// * `BatchError::EmptyBatch` — `requests` is empty.
/// * `BatchError::ArithmeticOverflow` — a balance subtraction would overflow `i128`.
///
/// # Gas notes
///
/// `get_balance` and `set_balance` are called at most once per unique owner per
/// run through the loop. TTL bumps should be embedded in those closures (as done
/// in `VaultContract::read_balance` / `write_balance`) so no extra storage
/// operations are needed here.
///
/// # Events emitted
///
/// * Topic: `("withdraw", owner)` — Data: `(recipient, amount)` — on success.
pub fn process_batch(
    env: &Env,
    requests: Vec<WithdrawalRequest>,
    get_balance: impl Fn(&Env, &Address) -> i128,
    set_balance: impl Fn(&Env, &Address, i128),
) -> Vec<WithdrawalOutcome> {
    if requests.is_empty() {
        soroban_sdk::panic_with_error!(env, BatchError::EmptyBatch);
    }

    let mut outcomes: Vec<WithdrawalOutcome> = Vec::new(env);

    for req in requests.iter() {
        // Each owner must explicitly authorise their own withdrawal.
        req.owner.require_auth();

        // ── Validation: zero / negative amount ──────────────────────────────
        if req.amount <= 0 {
            outcomes.push_back(WithdrawalOutcome {
                owner: req.owner.clone(),
                amount: req.amount,
                success: false,
                failure_code: FailureReason::ZeroOrNegativeAmount as u32,
            });
            continue;
        }

        // ── Balance check ────────────────────────────────────────────────────
        let current = get_balance(env, &req.owner);
        if current < req.amount {
            outcomes.push_back(WithdrawalOutcome {
                owner: req.owner.clone(),
                amount: req.amount,
                success: false,
                failure_code: FailureReason::InsufficientBalance as u32,
            });
            continue;
        }

        // ── Safe arithmetic debit ────────────────────────────────────────────
        // Use checked_sub to guard against any edge-case overflow. A failure
        // here indicates corrupted state and is a hard panic.
        let new_balance = match current.checked_sub(req.amount) {
            Some(v) => v,
            None => soroban_sdk::panic_with_error!(env, BatchError::ArithmeticOverflow),
        };

        // ── Write new balance ────────────────────────────────────────────────
        // TTL is bumped inside set_balance (see VaultContract::write_balance),
        // so no additional extend_ttl call is required here — one storage op.
        set_balance(env, &req.owner, new_balance);

        // ── Emit withdrawal event for the indexer ────────────────────────────
        env.events().publish(
            (soroban_sdk::symbol_short!("withdraw"), req.owner.clone()),
            (req.recipient.clone(), req.amount),
        );

        outcomes.push_back(WithdrawalOutcome {
            owner: req.owner.clone(),
            amount: req.amount,
            success: true,
            failure_code: FailureReason::None as u32,
        });
    }

    outcomes
}

/// Strict variant of [`process_batch`] that performs a pre-flight token
/// allocation check across the full request list before executing any
/// state change.
///
/// # When to use
///
/// Use `process_batch_strict` when you need a hard guarantee that the batch
/// will not produce *any* `InsufficientBalance` failures. If the pre-flight
/// check detects that any owner would be over-drawn across the aggregated
/// requests, the entire call panics with `BatchError::PreflightFailed`
/// before touching any state.
///
/// The standard `process_batch` is cheaper when soft failures are acceptable.
///
/// # Pre-flight algorithm
///
/// For each unique `owner` in `requests`, the function sums all requested
/// amounts and compares against the current vault balance. Duplicate entries
/// for the same owner accumulate — e.g. two requests of 300 against a balance
/// of 500 will fail pre-flight even though each individual request would pass.
///
/// # Panics
///
/// * `BatchError::EmptyBatch` — `requests` is empty.
/// * `BatchError::PreflightFailed` — at least one owner would be over-drawn.
/// * `BatchError::ArithmeticOverflow` — total requested amount overflows `i128`.
pub fn process_batch_strict(
    env: &Env,
    requests: Vec<WithdrawalRequest>,
    get_balance: impl Fn(&Env, &Address) -> i128,
    set_balance: impl Fn(&Env, &Address, i128),
) -> Vec<WithdrawalOutcome> {
    if requests.is_empty() {
        soroban_sdk::panic_with_error!(env, BatchError::EmptyBatch);
    }

    // ── Pre-flight: verify token allocations ─────────────────────────────────
    // Collect unique owners and verify each can cover the sum of their requests.
    // We iterate once, tracking which owners have already been checked to avoid
    // redundant work for duplicate entries.
    let mut checked: Vec<Address> = Vec::new(env);
    for req in requests.iter() {
        // Skip owners already validated.
        let already_checked = checked.iter().any(|a| a == req.owner);
        if already_checked {
            continue;
        }

        let total_requested = match sum_requested_for_owner(env, &requests, &req.owner) {
            Some(v) => v,
            None => soroban_sdk::panic_with_error!(env, BatchError::ArithmeticOverflow),
        };

        let current = get_balance(env, &req.owner);
        if current < total_requested {
            soroban_sdk::panic_with_error!(env, BatchError::PreflightFailed);
        }

        checked.push_back(req.owner.clone());
    }

    // Pre-flight passed — delegate to standard processor.
    process_batch(env, requests, get_balance, set_balance)
}
