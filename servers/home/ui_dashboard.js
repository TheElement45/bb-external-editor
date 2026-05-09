/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.ui.openTail();

    const reset = "\x1b[0m";
    const cyan = "\x1b[36m";
    const green = "\x1b[32m";
    const yellow = "\x1b[33m";
    const red = "\x1b[31m";
    const magenta = "\x1b[35m";

    while (true) {
        ns.clearLog();
        const player = ns.getPlayer();
        
        const homeMaxRam = ns.getServerMaxRam("home");
        const homeUsedRam = ns.getServerUsedRam("home");
        const ramPct = homeMaxRam > 0 ? (homeUsedRam / homeMaxRam) * 100 : 0;
        
        ns.print(`${cyan}================= BITBURNER DASHBOARD =================${reset}`);
        ns.print(`${magenta}Player Stats:${reset}`);
        ns.print(`  Money:   ${green}$${ns.format.number(player.money)}${reset}`);
        ns.print(`  City:    ${player.city}`);
        ns.print(`  HP:      ${player.hp.current} / ${player.hp.max}`);
        
        ns.print(`\n${magenta}Home Server RAM:${reset}`);
        ns.print(`  Usage:   ${ramPct > 90 ? red : green}${ns.format.number(homeUsedRam)} GB / ${ns.format.number(homeMaxRam)} GB${reset} (${ns.format.number(ramPct)}%)`);
        
        const processes = ns.ps("home");
        const grouped = {};
        for (const p of processes) {
            grouped[p.filename] = (grouped[p.filename] || 0) + 1;
        }
        
        ns.print(`\n${magenta}Active Scripts on Home:${reset}`);
        for (const [script, count] of Object.entries(grouped)) {
            ns.print(`  ${script.padEnd(20)}: ${yellow}${count} instances${reset}`);
        }
        
        // Let's add hacknet summary if possible
        try {
            const numNodes = ns.hacknet.numNodes();
            if (numNodes > 0) {
                let totalProd = 0;
                for (let i = 0; i < numNodes; i++) {
                    totalProd += ns.hacknet.getNodeStats(i).production;
                }
                ns.print(`\n${magenta}Hacknet Stats:${reset}`);
                ns.print(`  Nodes:   ${numNodes}`);
                ns.print(`  Prod:    ${green}$${ns.format.number(totalProd)} / sec${reset}`);
            }
        } catch (e) {
            // Ignore if hacknet API fails
        }
        
        ns.print(`${cyan}=======================================================${reset}`);
        
        await ns.sleep(1000); // Refresh every second
    }
}
