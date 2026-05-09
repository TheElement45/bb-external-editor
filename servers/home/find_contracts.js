// servers/home/lib/network.js
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

// servers/home/find_contracts.js
async function main(ns) {
  const servers = getNetworkSimple(ns);
  let totalContracts = 0;
  ns.tprint(`Scanning ${servers.length} servers for Coding Contracts...`);
  ns.tprint(`-----------------------------------------------------`);
  for (let server of servers) {
    let contracts = ns.ls(server, ".cct");
    if (contracts.length > 0) {
      totalContracts += contracts.length;
      ns.tprint(`[+] Found ${contracts.length} contract(s) on '${server}'`);
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
export {
  main
};
