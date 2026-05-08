/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.ui.openTail();
    ns.print("--- Master Supervisor Started ---");

    const daemonScripts = [
        { name: "batcher.js", args: [] },
        { name: "auto_buy.js", args: [] },
        { name: "auto_hacknet.js", args: [] },
        { name: "share_manager.js", args: [] }
    ];

    while (true) {
        for (let script of daemonScripts) {
            // Check if the script exists before trying to run it
            if (!ns.fileExists(script.name, "home")) {
                ns.print(`[WARN] ${script.name} not found on home.`);
                continue;
            }

            // If the script is not running, attempt to launch it
            if (!ns.isRunning(script.name, "home", ...script.args)) {
                ns.print(`[INFO] Attempting to start ${script.name}...`);
                
                // Run with 1 thread
                let pid = ns.run(script.name, 1, ...script.args);
                
                if (pid > 0) {
                    ns.print(`[SUCCESS] Launched ${script.name} (PID: ${pid})`);
                } else {
                    ns.print(`[ERROR] Failed to launch ${script.name}. Insufficient RAM?`);
                }
            }
        }
        
        // Wait 10 seconds before checking again
        await ns.sleep(10000);
    }
}
