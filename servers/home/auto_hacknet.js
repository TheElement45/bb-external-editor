/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.print("--- Auto-Hacknet Manager Started ---");

    // ---------------------------------------------------------
    // CONFIGURATION
    // ---------------------------------------------------------
    const ALLOWANCE = 0.20; // 20% of current home money is the max budget per upgrade

    while (true) {
        let money = ns.getServerMoneyAvailable("home");
        let budget = money * ALLOWANCE;

        let numNodes = ns.hacknet.numNodes();
        let bestCost = Infinity;
        let action = null;

        // 1. Check the cost of buying a brand new node
        let nodeCost = ns.hacknet.getPurchaseNodeCost();
        if (nodeCost < bestCost) {
            bestCost = nodeCost;
            action = { type: "node" };
        }

        // 2. Check the cost of all upgrades across all existing nodes
        for (let i = 0; i < numNodes; i++) {
            let levelCost = ns.hacknet.getLevelUpgradeCost(i, 1);
            let ramCost = ns.hacknet.getRamUpgradeCost(i, 1);
            let coreCost = ns.hacknet.getCoreUpgradeCost(i, 1);

            if (levelCost < bestCost) {
                bestCost = levelCost;
                action = { type: "level", index: i };
            }
            if (ramCost < bestCost) {
                bestCost = ramCost;
                action = { type: "ram", index: i };
            }
            if (coreCost < bestCost) {
                bestCost = coreCost;
                action = { type: "core", index: i };
            }
        }

        // 3. Purchase the cheapest available upgrade if it is within our budget allowance
        if (action && bestCost <= budget) {
            if (action.type === "node") {
                let res = ns.hacknet.purchaseNode();
                if (res !== -1) ns.print(`[+] Bought Hacknet Node ${res} for $${ns.format.number(bestCost)}`);
            } else if (action.type === "level") {
                if (ns.hacknet.upgradeLevel(action.index, 1)) {
                    ns.print(`[^] Upgraded Level on Node ${action.index} for $${ns.format.number(bestCost)}`);
                }
            } else if (action.type === "ram") {
                if (ns.hacknet.upgradeRam(action.index, 1)) {
                    ns.print(`[^] Upgraded RAM on Node ${action.index} for $${ns.format.number(bestCost)}`);
                }
            } else if (action.type === "core") {
                if (ns.hacknet.upgradeCore(action.index, 1)) {
                    ns.print(`[^] Upgraded Cores on Node ${action.index} for $${ns.format.number(bestCost)}`);
                }
            }
            
            // Sleep briefly to avoid freezing the game
            await ns.sleep(10);
        } else {
            // Wait for more money to accumulate before checking again
            await ns.sleep(1000);
        }
    }
}
