import { getNetworkSimple } from "./lib/network.js";

/** @param {NS} ns */
export async function main(ns) {
    // We use the simple scan from the network library which gets all servers 
    // without attempting to automatically nuke them.
    const servers = getNetworkSimple(ns);
    let totalContracts = 0;

    ns.tprint(`Scanning ${servers.length} servers for Coding Contracts...`);
    ns.tprint(`-----------------------------------------------------`);

    for (let server of servers) {
        // Find all files ending in .cct on the current server
        let contracts = ns.ls(server, ".cct");
        
        if (contracts.length > 0) {
            totalContracts += contracts.length;
            ns.tprint(`[+] Found ${contracts.length} contract(s) on '${server}'`);
            
            // Print the details of each contract found
            for (let contract of contracts) {
                let type = ns.codingcontract.getContractType(contract, server);
                ns.tprint(`    => ${contract} (${type})`);
            }
        }
    }

    ns.tprint(`-----------------------------------------------------`);
    if (totalContracts > 0) {
        ns.tprint(`Finished! Found a total of ${totalContracts} coding contracts.`);
        ns.tprint(`Connect to these servers and run the contract to solve them for rewards.`);
    } else {
        ns.tprint(`Finished! No coding contracts were found on the network right now.`);
        ns.tprint(`(Contracts spawn periodically, try again later)`);
    }
}
