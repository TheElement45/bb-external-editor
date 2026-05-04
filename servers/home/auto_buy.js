/** @param {NS} ns */
export async function main(ns) {
    // ---------------------------------------------------------
    // CONFIGURATION
    // ---------------------------------------------------------
    const moneyAllowance = 0.5;
    const startingRam = 8; 

    const maxRam = ns.cloud.getRamLimit();
    const serverLimit = ns.cloud.getServerLimit();

    ns.disableLog("getServerMoneyAvailable");
    ns.disableLog("sleep");
    ns.disableLog("getServerMaxRam");

    ns.print(`--- Auto-Buyer Started ---`);
    ns.print(`Targeting Max RAM: ${ns.format.ram(maxRam)} per server.`);

    while (true) {
        let myServers = ns.cloud.getServerNames();
        let budget = ns.getServerMoneyAvailable("home") * moneyAllowance;

        // ==========================================
        // PHASE 1: FILL EMPTY SERVER SLOTS
        // ==========================================
        if (myServers.length < serverLimit) {
            let targetRam = startingRam;
            
            while (ns.cloud.getServerCost(targetRam * 2) <= budget && (targetRam * 2) <= maxRam) {
                targetRam *= 2;
            }

            if (ns.cloud.getServerCost(targetRam) <= budget) {
                let hostname = ns.cloud.purchaseServer("pserv", targetRam);
                if (hostname !== "") {
                    ns.print(`[+] Bought new server: ${hostname} (${ns.format.ram(targetRam)})`);
                }
            }
        } 
        
        // ==========================================
        // PHASE 2: UPGRADE EXISTING SERVERS
        // ==========================================
        else {
            let weakestServer = myServers.reduce((weakest, current) => {
                return ns.getServerMaxRam(current) < ns.getServerMaxRam(weakest) ? current : weakest;
            });

            let currentRam = ns.getServerMaxRam(weakestServer);
            
            if (currentRam >= maxRam) {
                ns.tprint("SUCCESS: All purchased servers are maxed out!");
                return; 
            }

            let targetRam = currentRam * 2;
            
            while (ns.cloud.getServerUpgradeCost(weakestServer, targetRam * 2) <= budget && (targetRam * 2) <= maxRam) {
                targetRam *= 2;
            }

            let upgradeCost = ns.cloud.getServerUpgradeCost(weakestServer, targetRam);

            if (upgradeCost > 0 && upgradeCost <= budget) {
                if (ns.cloud.upgradeServer(weakestServer, targetRam)) {
                    ns.print(`[^] Upgraded ${weakestServer} to ${ns.format.ram(targetRam)} for $${ns.format.number(upgradeCost)}`);
                }
            }
        }

        await ns.sleep(10000); 
    }
}