// servers/home/buy_programs.js
async function main(ns) {
  ns.disableLog("ALL");
  ns.print("Starting Darkweb Auto-Buyer...");
  ns.ui.openTail();
  const programs = [
    "BruteSSH.exe",
    "FTPCrack.exe",
    "relaySMTP.exe",
    "HTTPWorm.exe",
    "SQLInject.exe",
    "ServerProfiler.exe",
    "DeepscanV1.exe",
    "DeepscanV2.exe",
    "AutoLink.exe",
    "Formulas.exe"
  ];
  while (true) {
    let money = ns.getServerMoneyAvailable("home");
    if (!ns.hasTorRouter()) {
      if (money >= 2e5) {
        if (ns.singularity.purchaseTor()) {
          ns.print("[SUCCESS] Purchased TOR Router!");
        }
      } else {
        ns.print(`[WAIT] Need $200k for TOR router. Have $${ns.format.number(money)}`);
        await ns.sleep(1e4);
        continue;
      }
    }
    let allBought = true;
    for (let prog of programs) {
      if (!ns.fileExists(prog, "home")) {
        allBought = false;
        let cost = ns.singularity.getDarkwebProgramCost(prog);
        if (cost > 0 && ns.getServerMoneyAvailable("home") >= cost) {
          if (ns.singularity.purchaseProgram(prog)) {
            ns.print(`[SUCCESS] Purchased ${prog} for $${ns.format.number(cost)}!`);
          }
        }
      }
    }
    if (allBought) {
      ns.print("[DONE] All specified Darkweb programs purchased.");
      break;
    }
    await ns.sleep(5e3);
  }
}
export {
  main
};
