/**
 * Shared network utilities for Bitburner automation scripts.
 * Bundled inline by esbuild — no extra ns.scp() needed at runtime.
 */

/** Reserved RAM on home server to keep space for the player. */
export const HOME_RESERVED_RAM = 64;

/**
 * BFS-scan the entire network, include purchased servers, and auto-nuke
 * every server where we have enough port-crackers.
 * @param {NS} ns
 * @returns {string[]} All discovered server hostnames.
 */
export function getNetwork(ns) {
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

  // Auto-Nuke during scan
  for (let server of servers) {
    if (server !== "home" && !ns.hasRootAccess(server)) {
      let ports = 0;
      if (ns.fileExists("BruteSSH.exe", "home")) { ns.brutessh(server); ports++; }
      if (ns.fileExists("FTPCrack.exe", "home")) { ns.ftpcrack(server); ports++; }
      if (ns.fileExists("relaySMTP.exe", "home")) { ns.relaysmtp(server); ports++; }
      if (ns.fileExists("HTTPWorm.exe", "home")) { ns.httpworm(server); ports++; }
      if (ns.fileExists("SQLInject.exe", "home")) { ns.sqlinject(server); ports++; }

      if (ns.getServerNumPortsRequired(server) <= ports) {
        ns.nuke(server);
      }
    }
  }
  return servers;
}

/**
 * BFS-scan the entire network and include purchased servers.
 * Does NOT attempt to nuke anything — useful for scripts that only
 * need to discover servers (e.g. share_manager).
 * @param {NS} ns
 * @returns {string[]} All discovered server hostnames.
 */
export function getNetworkSimple(ns) {
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

/**
 * Select the best hacking target from a list of servers.
 * Uses time-efficiency scoring: maxMoney / weakenTime.
 * Only considers servers where requiredHackLevel <= playerLevel / 2.
 * @param {NS} ns
 * @param {string[]} servers - List of server hostnames to evaluate.
 * @returns {string|null} The best target hostname, or null if none found.
 */
export function getBestTarget(ns, servers) {
  let bestTarget = null;
  let bestScore = -1;
  const playerHackLevel = ns.getHackingLevel();

  for (let server of servers) {
    if (!ns.hasRootAccess(server) || ns.getServerMaxMoney(server) === 0 || server === "home") continue;
    if (server === "n00dles") continue;

    let reqHackLevel = ns.getServerRequiredHackingLevel(server);

    if (reqHackLevel <= playerHackLevel / 2) {
      let maxMoney = ns.getServerMaxMoney(server);
      let weakenTime = Math.max(1, ns.getWeakenTime(server));
      let score = maxMoney / weakenTime;
      if (score > bestScore) {
        bestScore = score;
        bestTarget = server;
      }
    }
  }
  return bestTarget;
}
