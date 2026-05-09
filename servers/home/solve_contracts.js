import { solvers } from './lib/solvers.js';

function getNetworkSimple(ns) {
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
  return servers;
}

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.tail();

    const reset = "\x1b[0m";
    const green = "\x1b[32m";
    const yellow = "\x1b[33m";
    const red = "\x1b[31m";
    const cyan = "\x1b[36m";
    const magenta = "\x1b[35m";

    ns.print(`${magenta}Starting Contract Auto-Solver...${reset}`);

    // Option to run once or loop
    const continuous = ns.args.includes("--loop");

    do {
        ns.print(`\n${cyan}Scanning network for contracts...${reset}`);
        const servers = getNetworkSimple(ns);
        let solvedCount = 0;
        let failedCount = 0;
        let missingCount = 0;

        for (const server of servers) {
            const contracts = ns.ls(server, ".cct");
            
            for (const contract of contracts) {
                const type = ns.codingcontract.getContractType(contract, server);
                const data = ns.codingcontract.getData(contract, server);
                const tries = ns.codingcontract.getNumTriesRemaining(contract, server);
                
                ns.print(`Found: ${yellow}${contract}${reset} on ${server} (${type})`);

                if (solvers[type]) {
                    try {
                        const answer = solvers[type](data);
                        // Prevent accidental failure if we only have 1 try left and we aren't 100% sure.
                        if (tries <= 1) {
                            ns.print(`  ${red}Skipping: Only 1 try remaining. Too risky.${reset}`);
                            continue;
                        }

                        const result = ns.codingcontract.attempt(answer, contract, server);
                        if (result !== "") {
                            ns.print(`  ${green}SUCCESS: ${result}${reset}`);
                            solvedCount++;
                        } else {
                            ns.print(`  ${red}FAILED: Wrong answer submitted!${reset}`);
                            failedCount++;
                        }
                    } catch (e) {
                        ns.print(`  ${red}ERROR executing solver: ${e}${reset}`);
                        failedCount++;
                    }
                } else {
                    ns.print(`  ${red}No solver implemented yet.${reset}`);
                    missingCount++;
                }
            }
        }

        ns.print(`\n${magenta}Cycle Summary:${reset}`);
        ns.print(`  Solved:  ${green}${solvedCount}${reset}`);
        ns.print(`  Failed:  ${red}${failedCount}${reset}`);
        ns.print(`  Missing: ${yellow}${missingCount}${reset} (Needs solver logic)`);

        if (continuous) {
            ns.print(`\nSleeping for 5 minutes...`);
            await ns.sleep(5 * 60 * 1000); // Check every 5 minutes
        }
    } while (continuous);
    
    if (!continuous) {
        ns.print(`\n${yellow}Run with --loop to keep the script running continuously.${reset}`);
    }
}
