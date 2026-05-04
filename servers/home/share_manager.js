import { getNetworkSimple, HOME_RESERVED_RAM } from "./lib/network.js";

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");
  ns.tail();

  const WORKER = "cmd_share.js";

  // Dynamically generate the share worker
  ns.write(
    WORKER,
    `/** @param {NS} ns */\nexport async function main(ns) { while(true) { await ns.share(); } }`,
    "w"
  );

  ns.print("Starting Share Manager...");

  while (true) {
    let servers = getNetworkSimple(ns);
    let totalThreads = 0;

    for (let server of servers) {
      if (!ns.hasRootAccess(server)) continue;

      let avail = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);

      // Protect our reserved space on home
      if (server === "home") {
        avail = Math.max(0, avail - HOME_RESERVED_RAM);
      }

      let threads = Math.floor(avail / ns.getScriptRam(WORKER));

      if (threads > 0) {
        if (server !== "home") {
          await ns.scp(WORKER, server, "home");
        }

        // We add a unique ID (Date.now()) so we can spawn multiple instances if more RAM frees up later.
        let pid = ns.exec(WORKER, server, threads, Date.now());
        if (pid === 0) {
          ns.print(`WARN: Failed to exec ${WORKER} on ${server} (${threads} threads)`);
        } else {
          totalThreads += threads;
        }
      }
    }

    if (totalThreads > 0) {
      ns.print(`Deployed ${totalThreads} new share threads across the network.`);
      ns.print(`Current Bonus: ${ns.format.number(ns.getSharePower(), 3)}x`);
    }

    // Sleep for 10 seconds (the duration of a share pulse) and check if new RAM freed up
    await ns.sleep(10000);
  }
}
