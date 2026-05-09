/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.tail();

    // Ensure we have Singularity API access
    try {
        ns.singularity.checkFactionInvitations();
    } catch (e) {
        ns.print("ERROR: This script requires Singularity API (Source-File 4) access to function.");
        return;
    }

    const reset = "\x1b[0m";
    const green = "\x1b[32m";
    const yellow = "\x1b[33m";
    const magenta = "\x1b[35m";
    const cyan = "\x1b[36m";

    ns.print(`${magenta}Starting Auto-Ascension Manager...${reset}`);

    while (true) {
        ns.print(`\n${cyan}--- Cycle Check: ${new Date().toLocaleTimeString()} ---${reset}`);
        
        // 1. Join pending factions
        const invites = ns.singularity.checkFactionInvitations();
        for (const faction of invites) {
            ns.print(`${green}Joining faction: ${faction}${reset}`);
            ns.singularity.joinFaction(faction);
        }

        // 2. Buy Augmentations
        const myFactions = ns.getPlayer().factions;
        
        // Fetch it dynamically inside the loop to get updated lists if we buy something
        let ownedAugs = ns.singularity.getOwnedAugmentations(true);
        let availableAugs = [];
        
        for (const faction of myFactions) {
            const augs = ns.singularity.getAugmentationsFromFaction(faction);
            for (const aug of augs) {
                if (aug === "NeuroFlux Governor") continue; // Ignore NFG for now, handled manually or end-of-node
                if (ownedAugs.includes(aug)) continue;

                const price = ns.singularity.getAugmentationPrice(aug);
                const reqRep = ns.singularity.getAugmentationRepReq(aug);
                const myRep = ns.singularity.getFactionRep(faction);

                if (myRep >= reqRep) {
                    // Check if it's already in the list (different factions can sell the same aug)
                    if (!availableAugs.some(a => a.name === aug)) {
                        availableAugs.push({
                            name: aug,
                            faction: faction,
                            price: price,
                            reqRep: reqRep
                        });
                    }
                }
            }
        }

        // Sort by most expensive first to optimize the cost multiplier
        availableAugs.sort((a, b) => b.price - a.price);

        let purchasedThisCycle = 0;
        for (const augInfo of availableAugs) {
            const myMoney = ns.getServerMoneyAvailable("home");
            
            // We must re-check price since buying an aug increases the price of others!
            const currentPrice = ns.singularity.getAugmentationPrice(augInfo.name);
            
            if (myMoney >= currentPrice) {
                if (ns.singularity.purchaseAugmentation(augInfo.faction, augInfo.name)) {
                    ns.print(`${green}SUCCESS: Purchased ${augInfo.name} from ${augInfo.faction} for $${ns.format.number(currentPrice)}${reset}`);
                    purchasedThisCycle++;
                    // We must update ownedAugs because we just bought one!
                    ownedAugs = ns.singularity.getOwnedAugmentations(true);
                }
            }
        }

        if (purchasedThisCycle > 0) {
            ns.print(`${yellow}Bought ${purchasedThisCycle} new augmentations!${reset}`);
        }

        // 3. Work for a faction if there is an augment we can't afford the reputation for
        let targetFaction = null;
        let lowestRepNeeded = Infinity; // We want to work for the easiest augment to reach first

        for (const faction of myFactions) {
            const augs = ns.singularity.getAugmentationsFromFaction(faction);
            for (const aug of augs) {
                if (aug === "NeuroFlux Governor" || ownedAugs.includes(aug)) continue;
                
                const reqRep = ns.singularity.getAugmentationRepReq(aug);
                const myRep = ns.singularity.getFactionRep(faction);

                if (myRep < reqRep) {
                    const remainingRep = reqRep - myRep;
                    if (remainingRep < lowestRepNeeded) {
                        lowestRepNeeded = remainingRep;
                        targetFaction = faction;
                    }
                }
            }
        }

        if (targetFaction) {
            const currentWork = ns.singularity.getCurrentWork();
            const isWorkingForTarget = currentWork !== null && currentWork.type === "FACTION" && currentWork.factionName === targetFaction;
            
            if (!isWorkingForTarget) {
                ns.print(`${yellow}Starting work for ${targetFaction} to grind reputation...${reset}`);
                
                // Prioritize Hacking, then Field, then Security (basic fallback)
                if (!ns.singularity.workForFaction(targetFaction, "Hacking Contracts", false)) {
                    if (!ns.singularity.workForFaction(targetFaction, "Field Work", false)) {
                        ns.singularity.workForFaction(targetFaction, "Security Work", false);
                    }
                }
            }
        }

        // Sleep for 60 seconds before checking again
        await ns.sleep(60000); 
    }
}
