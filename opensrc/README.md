# Opensrc — Pinned External Dependencies

External code that we reference directly (not via package managers).
Pinned versions tracked in `sources.json`.

## Why not cargo crates.io?

- Some deps are not on crates.io (e.g. x402 spec, A2A protocol)
- We need to read the SOURCE CODE, not just use as binary
- Audit-friendly: exact commit hash, full history

## Structure

```
opensrc/
├── repos/              # git clones of external repos
│   └── github.com/
│       ├── a2aproject/A2A/
│       ├── coinbase/x402/
│       ├── dfinity/ic-cdk/
│       ├── dfinity/stable-structures/
│       ├── dfinity/candid/
│       ├── jedisct1/libsodium/
│       ├── rust-bitcoin/rust-bitcoin/
│       └── ...
├── sources.json        # pinned versions (source of truth)
└── settings.json
```

## Fetch all repos

```bash
cd opensrc
# ICP SDKs
git clone https://github.com/dfinity/ic-cdk.git repos/github.com/dfinity/ic-cdk
git clone https://github.com/dfinity/stable-structures.git repos/github.com/dfinity/stable-structures
git clone https://github.com/dfinity/candid.git repos/github.com/dfinity/candid

# Protocols
git clone https://github.com/coinbase/x402.git repos/github.com/coinbase/x402
git clone https://github.com/a2aproject/A2A.git repos/github.com/a2aproject/A2A
git clone https://github.com/sudeepb02/awesome-erc8004.git repos/github.com/sudeepb02/awesome-erc8004

# Crypto
git clone https://github.com/jedisct1/libsodium.git repos/github.com/jedisct1/libsodium

# BTC
git clone https://github.com/rust-bitcoin/rust-bitcoin.git repos/github.com/rust-bitcoin/rust-bitcoin

# ICP BTC examples
git clone https://github.com/nickvsadquarters/ic-bitcoin.git repos/github.com/nickvsadquarters/ic-bitcoin
```

## Update a single repo

```bash
cd opensrc/repos/github.com/dfinity/ic-cdk
git fetch origin
git checkout <new-tag-or-commit>
# Update sources.json "fetchedAt" date
```

## What we read from each repo

| Repo | What we use |
|------|-------------|
| dfinity/ic-cdk | canister macro, update/query decorators |
| dfinity/stable-structures | StableBTreeMap, VirtualMemory |
| dfinity/candid | CandidType, Deserialize derive |
| coinbase/x402 | HTTP 402 payment flow, spec |
| a2aproject/A2A | Agent card format, A2A protocol |
| awesome-erc8004 | ERC-8004 registry contract ABI |
| jedisct1/libsodium | ChaCha20, Blake2, Ed25519 APIs |
| rust-bitcoin | P2WPKH address validation |
| ic-bitcoin | ICP BTC integration examples |
