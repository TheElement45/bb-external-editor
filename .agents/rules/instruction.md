---
trigger: always_on
---

# Bitburner External Editor Codebase Context

## Project Overview
This workspace contains JavaScript automation scripts for the game [Bitburner](https://github.com/bitburner-official/bitburner-src). The scripts run using the Netscript (NS) API.

## Codebase Structure
- All active scripts meant to run inside the game exist under `servers/home/` (or `build/home/`).
- **Core Scripts:**
  - `master.js`: Early-game monolithic pulse dispatcher. Scans, cracks, and launches massive singular attacks (Hack, Weaken, or Grow). Good for the start of a Node.
  - `batcher.js`: Mid/Late-game continuous HWGW (Hack, Weaken, Grow, Weaken) batching script. Calculates exact thread math to drain and restore target money infinitely in parallel pipelines.
  - `share_manager.js`: Utility script that searches the network every 10 seconds for unused RAM and fills it with `cmd_share.js` threads to boost faction reputation gain (`ns.share()`).
  - `auto_buy.js`: (User's custom script) Handles automated purchasing.
- **Worker Scripts (`cmd_*.js`):** The main orchestration scripts (`master.js`, `batcher.js`, `share_manager.js`) dynamically generate minimal `cmd_hack.js`, `cmd_grow.js`, `cmd_weaken.js`, and `cmd_share.js` files and distribute them across the botnet via `ns.scp`.

## Design Rules & Considerations
- **Home RAM Reservation:** Always reserve RAM on `"home"` so the user can play the game and run other utilities. Use a constant like `const HOME_RESERVED_RAM = 64;` and apply `avail = Math.max(0, avail - HOME_RESERVED_RAM)` when calculating threads for the `home` server.
- **HWGW Batching Specs:** The batcher staggers execution so different scripts finish exactly `50ms` apart. Delay mathematics rely on subtracting the execution time from `ns.getWeakenTime(target)`.

## API Guidelines & Breaking Changes
The game's API has undergone several recent breaking changes. Always use the **modern API** for these functions:

1. **Formatting Functions:** Use the `ns.format` interface.
   - 🟢 `ns.format.number(value)` / `ns.format.percent(value)`
   - ❌ *Do not use `ns.formatNumber` or `ns.formatPercent`.*
2. **Purchased Servers (Cloud API):**
   - 🟢 `ns.cloud.getServerNames()`, `ns.cloud.purchaseServer(hostname, ram)`, `ns.cloud.deleteServer(hostname)`
   - ❌ *Do not use `ns.getPurchasedServers`, `ns.purchaseServer`, etc.*
3. **Cracking / Nuke APIs:**
   - Functions like `ns.nuke(server)`, `ns.brutessh(server)`, `ns.ftpcrack(server)` now safely return `false` on failure instead of throwing errors. They can be triggered blindly inside try/catch or conditional blocks without blowing up the script.
4. **Tail & UI:**
   - 🟢 `ns.ui.openTail()` or `ns.tail()`
   - ❌ *Deprecated UI methods have been removed.*
5. **Script Syntax:** 
   - 🟢 All scripts **MUST** use the NS2 syntax: `export async function main(ns) { ... }`.
   - ❌ *NS1 script support has been completely removed.*
