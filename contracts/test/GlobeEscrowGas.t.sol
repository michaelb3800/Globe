// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {GlobeEscrow} from "../src/GlobeEscrow.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Mock USDC for testing
contract MockToken is IERC20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply;
    
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        return true;
    }
}

contract GlobeEscrowGasTest is Test {
    GlobeEscrow public escrow;
    MockToken public token;
    
    address public requester = makeAddr("requester");
    address public provider = makeAddr("provider");
    
    uint256 constant ESCROW_AMOUNT = 100e6;
    
    // Gas snapshots
    uint256 gasCreate;
    uint256 gasFund;
    uint256 gasDeliver;
    uint256 gasVerify;
    uint256 gasWithdraw;
    uint256 gasCancel;
    uint256 gasRefund;
    
    function setUp() public {
        escrow = new GlobeEscrow();
        token = new MockToken();
        token.mint(requester, 1000e6);
        vm.prank(requester);
        token.approve(address(escrow), type(uint256).max);
    }
    
    // Measure gas for each operation
    function test_GasCreateEscrow() public {
        uint256 gasBefore = gasleft();
        bytes32 escrowId = escrow.createEscrow(provider, address(token), ESCROW_AMOUNT, 1 days);
        gasCreate = gasBefore - gasleft();
        console.log("Gas - CreateEscrow:", gasCreate);
    }
    
    function test_GasFundEscrow() public {
        bytes32 escrowId = escrow.createEscrow(provider, address(token), ESCROW_AMOUNT, 1 days);
        
        uint256 gasBefore = gasleft();
        vm.prank(requester);
        escrow.fundEscrow(escrowId);
        gasFund = gasBefore - gasleft();
        console.log("Gas - FundEscrow:", gasFund);
    }
    
    function test_GasDeliverArtifact() public {
        bytes32 escrowId = escrow.createEscrow(provider, address(token), ESCROW_AMOUNT, 1 days);
        vm.prank(requester);
        escrow.fundEscrow(escrowId);
        
        uint256 gasBefore = gasleft();
        vm.prank(provider);
        escrow.deliverArtifact(escrowId, "ipfs://QmHash1234567890");
        gasDeliver = gasBefore - gasleft();
        console.log("Gas - DeliverArtifact:", gasDeliver);
    }
    
    function test_GasVerifyAndRelease() public {
        bytes32 escrowId = escrow.createEscrow(provider, address(token), ESCROW_AMOUNT, 1 days);
        vm.prank(requester);
        escrow.fundEscrow(escrowId);
        vm.prank(provider);
        escrow.deliverArtifact(escrowId, "ipfs://QmHash1234567890");
        
        uint256 gasBefore = gasleft();
        vm.prank(requester);
        escrow.verifyAndRelease(escrowId);
        gasVerify = gasBefore - gasleft();
        console.log("Gas - VerifyAndRelease:", gasVerify);
    }
    
    function test_GasWithdraw() public {
        bytes32 escrowId = escrow.createEscrow(provider, address(token), ESCROW_AMOUNT, 1 days);
        vm.prank(requester);
        escrow.fundEscrow(escrowId);
        vm.prank(provider);
        escrow.deliverArtifact(escrowId, "ipfs://QmHash1234567890");
        vm.prank(requester);
        escrow.verifyAndRelease(escrowId);
        
        uint256 gasBefore = gasleft();
        vm.prank(provider);
        escrow.withdraw(escrowId);
        gasWithdraw = gasBefore - gasleft();
        console.log("Gas - Withdraw:", gasWithdraw);
    }
    
    function test_GasCancelMutual() public {
        bytes32 escrowId = escrow.createEscrow(provider, address(token), ESCROW_AMOUNT, 1 days);
        vm.prank(requester);
        escrow.fundEscrow(escrowId);
        
        uint256 gasBefore = gasleft();
        vm.prank(provider);
        escrow.cancelMutual(escrowId);
        gasCancel = gasBefore - gasleft();
        console.log("Gas - CancelMutual:", gasCancel);
    }
    
    function test_GasRefund() public {
        bytes32 escrowId = escrow.createEscrow(provider, address(token), ESCROW_AMOUNT, 1 days);
        vm.prank(requester);
        escrow.fundEscrow(escrowId);
        
        // Warp past grace period
        vm.warp(block.timestamp + 25 hours);
        
        uint256 gasBefore = gasleft();
        vm.prank(requester);
        escrow.refund(escrowId);
        gasRefund = gasBefore - gasleft();
        console.log("Gas - Refund:", gasRefund);
    }
    
    // Snapshot all gas usage
    function test_GasSnapshotAll() public {
        // Create
        bytes32 id1 = escrow.createEscrow(provider, address(token), ESCROW_AMOUNT, 1 days);
        
        // Fund
        vm.prank(requester);
        escrow.fundEscrow(id1);
        
        // Deliver
        vm.prank(provider);
        escrow.deliverArtifact(id1, "ipfs://QmHash");
        
        // Verify
        vm.prank(requester);
        escrow.verifyAndRelease(id1);
        
        // Withdraw
        vm.prank(provider);
        escrow.withdraw(id1);
        
        // Second escrow for cancel
        bytes32 id2 = escrow.createEscrow(provider, address(token), ESCROW_AMOUNT, 2 days);
        vm.prank(requester);
        escrow.fundEscrow(id2);
        vm.prank(provider);
        escrow.cancelMutual(id2);
        
        console.log("\nGas Usage Summary:");
        console.log("=====================");
        console.log("CreateEscrow:      ", gasCreate);
        console.log("FundEscrow:       ", gasFund);
        console.log("DeliverArtifact:  ", gasDeliver);
        console.log("VerifyAndRelease: ", gasVerify);
        console.log("Withdraw:         ", gasWithdraw);
        console.log("CancelMutual:    ", gasCancel);
        console.log("Refund:          ", gasRefund);
        
        // Assert reasonable gas limits
        assertLt(gasCreate, 150000, "CreateEscrow gas too high");
        assertLt(gasFund, 150000, "FundEscrow gas too high");
        assertLt(gasDeliver, 150000, "DeliverArtifact gas too high");
        assertLt(gasVerify, 200000, "VerifyAndRelease gas too high");
        assertLt(gasWithdraw, 150000, "Withdraw gas too high");
        assertLt(gasCancel, 150000, "CancelMutual gas too high");
        assertLt(gasRefund, 150000, "Refund gas too high");
    }
}
