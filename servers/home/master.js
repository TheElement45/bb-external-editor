import { getNetwork, getBestTarget, HOME_RESERVED_RAM } from "./lib/network.js";

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

      // Reserve RAM on home so you can still play the game
      if (server === "home") {
        availRam = Math.max(0, availRam - HOME_RESERVED_RAM);
      }

      let threads = Math.floor(availRam / scriptRam);

      if (threads > 0) {
        let pid = ns.exec(action, server, threads, target);
        if (pid === 0) {
          ns.print(`WARN: Failed to exec ${action} on ${server} (${threads} threads)`);
        } else {
          totalThreads += threads;
        }
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