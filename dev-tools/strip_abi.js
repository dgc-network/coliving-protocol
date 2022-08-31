const fs = require("fs")
const abi = JSON.parse(fs.readFileSync(0, "utf-8"));
console.log(JSON.stringify({ contractName: abi.contractName, abi: abi.abi }));
