/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");
  ns.tail();

  const WORKER = "cmd_share.js";
  const HOME_RESERVED_RAM = 64;

  // Dynamically generate the share worker
  ns.write(
    WORKER,
    `/** @param {NS} ns */\nexport async function main(ns) { while(true) { await ns.share(); } }`,
    "w"
  );

  ns.print("Starting Share Manager...");

  while (true) {
    let servers = getNetwork(ns);
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
        
        // Use threads as an argument just to ensure uniqueness if we want to run multiple sizes,
        // though normally it's easier to just run it without args and let it loop.
        // We add a unique ID (Date.now()) so we can spawn multiple instances if more RAM frees up later.
        ns.exec(WORKER, server, threads, Date.now());
        totalThreads += threads;
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

/** @param {NS} ns */
function getNetwork(ns) {
  let servers = ["home"];
  for (let i = 0; i < servers.length; i++) {
    let neighbors = ns.scan(servers[i]);
    for (let neighbor of neighbors) {
      if (!servers.includes(neighbor)) servers.push(neighbor);
    }
  }

  let purchased = ns.cloud.getServerNames();
  for (let p of purchased) {
    if (!servers.includes(p)) servers.push(p);
  }

  return servers;
}
