// servers/home/batcher.js
async function main(ns) {
  ns.disableLog("ALL");
  ns.ui.openTail();
  const workers = ["cmd_hack.js", "cmd_grow.js", "cmd_weaken.js"];
  for (let w of workers) {
    let cmd = w.split("_")[1].split(".")[0];
    ns.write(
      w,
      `/** @param {NS} ns */
export async function main(ns) { if (ns.args[1] > 0) await ns.sleep(ns.args[1]); await ns.${cmd}(ns.args[0]); }`,
      "w"
    );
  }
  let batchId = 0;
  const SPACER = 50;
  const HOME_RESERVED_RAM = 64; // Increased to ensure auto_buy.js and other scripts have enough space
  while (true) {
    let servers = getNetwork(ns);
    let target = getBestTarget(ns, servers);
    if (!target) {
      ns.print("No valid target found. Waiting...");
      await ns.sleep(5e3);
      continue;
    }
    let minSec = ns.getServerMinSecurityLevel(target);
    let sec = ns.getServerSecurityLevel(target);
    let maxMoney = ns.getServerMaxMoney(target);
    let money = ns.getServerMoneyAvailable(target);
    if (sec > minSec || money < maxMoney) {
      ns.clearLog();
      ns.print(`[ PREPARING ] ${target}`);
      ns.print(`Sec:   +${ns.format.number(sec - minSec, 2)} over min`);
      ns.print(`Money: ${ns.format.percent(money / maxMoney)}`);
      let action = sec > minSec ? "cmd_weaken.js" : "cmd_grow.js";
      let delayTime = sec > minSec ? ns.getWeakenTime(target) : ns.getGrowTime(target);
      let scriptRam = ns.getScriptRam(action);
      let deployed = 0;
      for (let s of servers) {
        if (!ns.hasRootAccess(s)) continue;
        let avail = ns.getServerMaxRam(s) - ns.getServerUsedRam(s);
        if (s === "home") avail = Math.max(0, avail - HOME_RESERVED_RAM);
        let t = Math.floor(avail / scriptRam);
        if (t > 0) {
          if (s !== "home") await ns.scp(workers, s, "home");
          ns.exec(action, s, t, target, 0, batchId++);
          deployed += t;
        }
      }
      if (deployed > 0) {
        ns.print(`Launched ${deployed} preparation threads.`);
        await ns.sleep(delayTime + 100);
      } else {
        ns.print("Network full, waiting for RAM...");
        await ns.sleep(2e3);
      }
      continue;
    }
    let hackPercent = 0.1;
    let hackAnalyze = ns.hackAnalyze(target);
    if (hackAnalyze <= 0) {
      await ns.sleep(2e3);
      continue;
    }
    let tHack = Math.max(1, Math.floor(hackPercent / hackAnalyze));
    let hackSec = ns.hackAnalyzeSecurity(tHack);
    let tWeaken1 = Math.max(1, Math.ceil(hackSec / ns.weakenAnalyze(1)));
    let growMult = 1 / (1 - tHack * hackAnalyze);
    let tGrow = Math.max(1, Math.ceil(ns.growthAnalyze(target, growMult)));
    let growSec = ns.growthAnalyzeSecurity(tGrow);
    let tWeaken2 = Math.max(1, Math.ceil(growSec / ns.weakenAnalyze(1)));
    let batchRam = tHack * ns.getScriptRam("cmd_hack.js") + tWeaken1 * ns.getScriptRam("cmd_weaken.js") + tGrow * ns.getScriptRam("cmd_grow.js") + tWeaken2 * ns.getScriptRam("cmd_weaken.js");
    let weakenTime = ns.getWeakenTime(target);
    let growTime = ns.getGrowTime(target);
    let hackTime = ns.getHackTime(target);
    let delayHack = weakenTime - SPACER - hackTime;
    let delayWeaken1 = 0;
    let delayGrow = weakenTime + SPACER - growTime;
    let delayWeaken2 = SPACER * 2;
    if (delayHack < 0 || delayGrow < 0) {
      await ns.sleep(1e3);
      continue;
    }
    let freeNetworkRam = 0;
    for (let s of servers) {
      if (!ns.hasRootAccess(s)) continue;
      let avail = ns.getServerMaxRam(s) - ns.getServerUsedRam(s);
      if (s === "home") avail = Math.max(0, avail - HOME_RESERVED_RAM);
      freeNetworkRam += avail;
    }
    if (freeNetworkRam < batchRam) {
      ns.print(`Waiting to deploy... Need: ${ns.format.number(batchRam)}GB`);
      await ns.sleep(1e3);
      continue;
    }
    ns.clearLog();
    ns.print(`[ CONTINUOUS HWGW ACTIVE ]`);
    ns.print(`Target:   ${target}`);
    ns.print(`Batches:  ${batchId}`);
    ns.print(`BatchRAM: ${ns.format.number(batchRam, 2)} GB`);
    batchId++;
    let tasks = [
      { script: "cmd_hack.js", threads: tHack, delay: delayHack, id: batchId },
      { script: "cmd_weaken.js", threads: tWeaken1, delay: delayWeaken1, id: batchId },
      { script: "cmd_grow.js", threads: tGrow, delay: delayGrow, id: batchId },
      { script: "cmd_weaken.js", threads: tWeaken2, delay: delayWeaken2, id: batchId }
    ];
    for (let task of tasks) {
      let remainingThreads = task.threads;
      for (let s of servers) {
        if (remainingThreads <= 0) break;
        if (!ns.hasRootAccess(s)) continue;
        let avail = ns.getServerMaxRam(s) - ns.getServerUsedRam(s);
        if (s === "home") avail = Math.max(0, avail - HOME_RESERVED_RAM);
        let capableT = Math.floor(avail / ns.getScriptRam(task.script));
        if (capableT > 0) {
          let launchT = Math.min(capableT, remainingThreads);
          if (s !== "home") await ns.scp(task.script, s, "home");
          ns.exec(task.script, s, launchT, target, task.delay, task.id);
          remainingThreads -= launchT;
        }
      }
    }
    await ns.sleep(SPACER * 4);
  }
}
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
  for (let server of servers) {
    if (server !== "home" && !ns.hasRootAccess(server)) {
      let ports = 0;
      if (ns.fileExists("BruteSSH.exe", "home")) {
        ns.brutessh(server);
        ports++;
      }
      if (ns.fileExists("FTPCrack.exe", "home")) {
        ns.ftpcrack(server);
        ports++;
      }
      if (ns.fileExists("relaySMTP.exe", "home")) {
        ns.relaysmtp(server);
        ports++;
      }
      if (ns.fileExists("HTTPWorm.exe", "home")) {
        ns.httpworm(server);
        ports++;
      }
      if (ns.fileExists("SQLInject.exe", "home")) {
        ns.sqlinject(server);
        ports++;
      }
      if (ns.getServerNumPortsRequired(server) <= ports) {
        ns.nuke(server);
      }
    }
  }
  return servers;
}
function getBestTarget(ns, servers) {
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
export {
  main
};
