// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {GlobeEscrow} from "../src/GlobeEscrow.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        string memory usdcAddress = vm.envString("USDC_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        GlobeEscrow escrow = new GlobeEscrow(usdcAddress);
        
        vm.stopBroadcast();
        
        console.log("GlobeEscrow deployed to:", address(escrow));
        console.log("USDC:", usdcAddress);
    }
}
