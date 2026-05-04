/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL"); // Keeps the default console clean
  ns.ui.openTail();            // Opens our custom UI window

  // 1. Dynamically write the 1.75GB micro-scripts so you don't have to
  const workers = ["cmd_hack.js", "cmd_grow.js", "cmd_weaken.js"];
  for (let w of workers) {
    let cmd = w.split("_")[1].split(".")[0];
    ns.write(w, `/** @param {NS} ns */\nexport async function main(ns) { await ns.${cmd}(ns.args[0]); }`, "w");
  }

  while (true) {
    let deployTargets = getNetwork(ns);
    let target = getBestTarget(ns, deployTargets);

    if (!target) {
      ns.print("No valid target found. Retrying in 5s...");
      await ns.sleep(5000);
      continue;
    }

    // 2. Evaluate target state
    let sec = ns.getServerSecurityLevel(target);
    let minSec = ns.getServerMinSecurityLevel(target);
    let money = ns.getServerMoneyAvailable(target);
    let maxMoney = ns.getServerMaxMoney(target);

    let action = "";
    let delay = 0;

    // 3. State-Machine Routing (Prioritize Security -> Money -> Hack)
    if (sec > minSec + 1) {
      action = "cmd_weaken.js";
      delay = ns.getWeakenTime(target);
    } else if (money < maxMoney * 0.9) {
      action = "cmd_grow.js";
      delay = ns.getGrowTime(target);
    } else {
      action = "cmd_hack.js";
      delay = ns.getHackTime(target);
    }

    // 4. Deploy the pulse
    let totalThreads = 0;
    let scriptRam = ns.getScriptRam(action);

    for (let server of deployTargets) {
      if (!ns.hasRootAccess(server)) continue;

      // Copy workers to the remote server
      if (server !== "home") await ns.scp(workers, server, "home");

      let availRam = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);

      // Reserve 32GB on home so you can still play the game
      if (server === "home") {
        availRam = Math.max(0, availRam - 32);
      }

      let threads = Math.floor(availRam / scriptRam);

      if (threads > 0) {
        ns.exec(action, server, threads, target);
        totalThreads += threads;
      }
    }

    // 5. Update UI Dashboard
    ns.clearLog();
    ns.print(`[ PULSE ORCHESTRATOR ONLINE ]`);
    ns.print(`================================`);
    ns.print(`Target:   ${target}`);
    ns.print(`Action:   ${action.split("_")[1].split(".")[0].toUpperCase()}`);
    ns.print(`Threads:  ${ns.format.number(totalThreads)}`);
    ns.print(`Money:    ${ns.format.percent(money / maxMoney)}`);
    ns.print(`Security: +${ns.format.number(sec - minSec)}`);
    ns.print(`ETA:      ${ns.format.time(delay)}`);
    ns.print(`================================`);

    // 6. Perfect Synchronization Sleep
    if (totalThreads === 0) {
      ns.print("Network full or insufficient RAM. Waiting...");
      await ns.sleep(2000);
    } else {
      // Sleep exactly until the botnet finishes, plus a 50ms safety buffer
      await ns.sleep(delay + 50);
    }
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

/** @param {NS} ns */
function getBestTarget(ns, servers) {
  let bestTarget = null;
  let bestScore = -1;
  const playerHackLevel = ns.getHackingLevel();

  for (let server of servers) {
    // Skip un-nuked servers, empty servers, and your own computer
    if (!ns.hasRootAccess(server) || ns.getServerMaxMoney(server) === 0 || server === "home") continue;

    let reqHackLevel = ns.getServerRequiredHackingLevel(server);

    if (reqHackLevel <= playerHackLevel / 2) {
      let maxMoney = ns.getServerMaxMoney(server);
      let minSec = Math.max(1, ns.getServerMinSecurityLevel(server));
      let growth = server === "n00dles" ? 1 : ns.getServerGrowth(server);

      let score = (maxMoney * growth) / minSec;
      if (score > bestScore) {
        bestScore = score;
        bestTarget = server;
      }
    }
  }
  return bestTarget;
}