import { getNetwork, getBestTarget, HOME_RESERVED_RAM } from "./lib/network.js";

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");
  ns.ui.openTail();

  // Generate delay-capable worker scripts
  const workers = ["cmd_hack.js", "cmd_grow.js", "cmd_weaken.js"];
  for (let w of workers) {
    let cmd = w.split("_")[1].split(".")[0];
    ns.write(
      w,
      `/** @param {NS} ns */\nexport async function main(ns) { if (ns.args[1] > 0) await ns.sleep(ns.args[1]); await ns.${cmd}(ns.args[0]); }`,
      "w"
    );
  }

  let batchId = 0;
  const SPACER = 50;

  const PROGRAMS = [
    "BruteSSH.exe",
    "FTPCrack.exe",
    "relaySMTP.exe",
    "HTTPWorm.exe",
    "SQLInject.exe"
  ];

  while (true) {
    // Auto-buy Tor and cracking programs using Singularity API
    try {
      ns.singularity.purchaseTor();
      for (let prog of PROGRAMS) {
        if (!ns.fileExists(prog, "home")) {
          ns.singularity.purchaseProgram(prog);
        }
      }
    } catch (e) {}

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

    // ── Preparation phase: bring target to min security and max money ──
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
          let pid = ns.exec(action, s, t, target, 0, batchId++);
          if (pid === 0) {
            ns.print(`WARN: Failed to exec ${action} on ${s} (${t} threads)`);
          } else {
            deployed += t;
          }
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

    // ── HWGW Batching Phase ──

    let hackAnalyze = ns.hackAnalyze(target);
    if (hackAnalyze <= 0) {
      await ns.sleep(2e3);
      continue;
    }

    // Cache script RAM costs
    let ramHack = ns.getScriptRam("cmd_hack.js");
    let ramWeaken = ns.getScriptRam("cmd_weaken.js");
    let ramGrow = ns.getScriptRam("cmd_grow.js");

    // Build a RAM snapshot of the network
    let totalFreeRam = 0;
    let totalNetworkRam = 0;
    let serverRam = []; // {host, free}
    for (let s of servers) {
      if (!ns.hasRootAccess(s)) continue;
      let max = ns.getServerMaxRam(s);
      let used = ns.getServerUsedRam(s);
      let avail = max - used;
      if (s === "home") avail = Math.max(0, avail - HOME_RESERVED_RAM);
      totalNetworkRam += (s === "home") ? Math.max(0, max - HOME_RESERVED_RAM) : max;
      if (avail > 0) {
        serverRam.push({ host: s, free: avail });
        totalFreeRam += avail;
      }
    }

    // ── 3B: Dynamic hackPercent — pick the % that maximises $/sec given available RAM ──
    let weakenTime = ns.getWeakenTime(target);
    let growTime = ns.getGrowTime(target);
    let hackTime = ns.getHackTime(target);

    let bestCfg = null;
    let bestIncome = -1;

    for (let hp of [0.05, 0.10, 0.15, 0.25, 0.35, 0.50]) {
      let tH = Math.max(1, Math.floor(hp / hackAnalyze));
      let actualSteal = tH * hackAnalyze;
      if (actualSteal >= 1) continue; // can't steal ≥100%

      let hSec = ns.hackAnalyzeSecurity(tH);
      let tW1 = Math.max(1, Math.ceil(hSec / ns.weakenAnalyze(1)));
      let gMult = 1 / (1 - actualSteal);
      let tG = Math.max(1, Math.ceil(ns.growthAnalyze(target, gMult)));
      let gSec = ns.growthAnalyzeSecurity(tG);
      let tW2 = Math.max(1, Math.ceil(gSec / ns.weakenAnalyze(1)));

      let ram = tH * ramHack + tW1 * ramWeaken + tG * ramGrow + tW2 * ramWeaken;
      let numB = Math.floor(totalFreeRam / ram);
      if (numB < 1) continue;

      // Cap by timing: can't have more overlapping batches than the weaken window allows
      let maxByTiming = Math.max(1, Math.floor(weakenTime / (SPACER * 4)));
      numB = Math.min(numB, maxByTiming);

      let moneyPerBatch = actualSteal * maxMoney;
      // All numB batches complete within one weakenTime cycle
      let income = (moneyPerBatch * numB) / (weakenTime / 1000);

      if (income > bestIncome) {
        bestIncome = income;
        bestCfg = { hp, tH, tW1, tG, tW2, ram, numB, moneyPerBatch };
      }
    }

    if (!bestCfg || bestCfg.numB < 1) {
      ns.print("Insufficient RAM for any batch config. Waiting...");
      await ns.sleep(2e3);
      continue;
    }

    let { hp: hackPercent, tH: tHack, tW1: tWeaken1, tG: tGrow, tW2: tWeaken2,
          ram: batchRam, numB: numBatches, moneyPerBatch } = bestCfg;

    // Calculate timing delays (finish order: Hack, W1, Grow, W2)
    let delayHack = weakenTime - SPACER - hackTime;
    let delayWeaken1 = 0;
    let delayGrow = weakenTime + SPACER - growTime;
    let delayWeaken2 = SPACER * 2;

    if (delayHack < 0 || delayGrow < 0) {
      await ns.sleep(1e3);
      continue;
    }

    // Desync guard: re-verify target is still prepped
    sec = ns.getServerSecurityLevel(target);
    money = ns.getServerMoneyAvailable(target);
    if (sec > minSec + 0.5 || money < maxMoney * 0.99) {
      ns.print(`Target drifted (sec: +${ns.format.number(sec - minSec, 2)}, money: ${ns.format.percent(money / maxMoney)}). Re-prepping...`);
      continue;
    }

    // ── 3C: Rich Dashboard ──
    let totalThreads = tHack + tWeaken1 + tGrow + tWeaken2;
    ns.clearLog();
    ns.print(`[ CONTINUOUS HWGW ACTIVE ]`);
    ns.print(`═══════════════════════════════════════`);
    ns.print(`Target:     ${target}`);
    ns.print(`Hack%:      ${ns.format.percent(hackPercent)}`);
    ns.print(`Income:     ~$${ns.format.number(bestIncome, 2)}/sec`);
    ns.print(`───────────────────────────────────────`);
    ns.print(`Batches:    ${numBatches} deploying  (${batchId} lifetime)`);
    ns.print(`Threads:    H:${tHack}  W₁:${tWeaken1}  G:${tGrow}  W₂:${tWeaken2}  (${totalThreads}/batch)`);
    ns.print(`BatchRAM:   ${ns.format.number(batchRam, 2)} GB`);
    ns.print(`NetworkRAM: ${ns.format.number(totalFreeRam, 2)} free / ${ns.format.number(totalNetworkRam, 2)} GB total`);
    ns.print(`Cycle:      ${ns.format.time(weakenTime)}`);
    ns.print(`═══════════════════════════════════════`);

    // ── 3A: Multi-batch saturation — deploy all batches with staggered offsets ──
    // Copy workers to all remote servers upfront to reduce latency
    for (let sr of serverRam) {
      if (sr.host !== "home") await ns.scp(workers, sr.host, "home");
    }

    let batchesLaunched = 0;
    let batchesFailed = 0;
    // Track available RAM per server as we deploy
    let ramLeft = serverRam.map(sr => ({ host: sr.host, free: sr.free }));

    for (let b = 0; b < numBatches; b++) {
      let offset = b * SPACER * 4;
      batchId++;

      let tasks = [
        { script: "cmd_hack.js", threads: tHack, delay: delayHack + offset, ram: ramHack },
        { script: "cmd_weaken.js", threads: tWeaken1, delay: delayWeaken1 + offset, ram: ramWeaken },
        { script: "cmd_grow.js", threads: tGrow, delay: delayGrow + offset, ram: ramGrow },
        { script: "cmd_weaken.js", threads: tWeaken2, delay: delayWeaken2 + offset, ram: ramWeaken },
      ];

      let batchOk = true;
      for (let task of tasks) {
        let remaining = task.threads;
        for (let sr of ramLeft) {
          if (remaining <= 0) break;
          let capableT = Math.floor(sr.free / task.ram);
          if (capableT <= 0) continue;
          let launchT = Math.min(capableT, remaining);
          let pid = ns.exec(task.script, sr.host, launchT, target, task.delay, batchId);
          if (pid === 0) {
            batchOk = false;
          } else {
            remaining -= launchT;
            sr.free -= launchT * task.ram;
          }
        }
        if (remaining > 0) batchOk = false;
      }

      if (batchOk) {
        batchesLaunched++;
      } else {
        batchesFailed++;
        break; // Stop deploying if we can't fit a full batch
      }
    }

    if (batchesFailed > 0) {
      ns.print(`WARN: ${batchesFailed} batch(es) failed to deploy fully.`);
    }
    ns.print(`Deployed ${batchesLaunched} batches. Waiting for completion...`);

    // Sleep until the entire wave completes, then launch the next wave
    // Last batch finishes at: weakenTime + SPACER*2 + (numBatches-1)*SPACER*4
    let waveTime = weakenTime + SPACER * 2 + (batchesLaunched - 1) * SPACER * 4 + SPACER;
    await ns.sleep(waveTime);
  }
}
