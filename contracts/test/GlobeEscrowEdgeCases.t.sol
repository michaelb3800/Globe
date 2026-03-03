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

contract GlobeEscrowEdgeCaseTest is Test {
    GlobeEscrow public escrow;
    MockToken public token;
    
    address public requester = makeAddr("requester");
    address public provider = makeAddr("provider");
    address public attacker = makeAddr("attacker");
    
    uint256 constant ESCROW_AMOUNT = 100e6;
    
    function setUp() public {
        escrow = new GlobeEscrow();
        token = new MockToken();
        token.mint(requester, 1000e6);
        vm.prank(requester);
        token.approve(address(escrow), type(uint256).max);
    }
    
    // ============ EDGE CASES ============
    
    function test_UnauthorizedDelivery() public {
        bytes32 escrowId = escrow.createEscrow(provider, address(token), ESCROW_AMOUNT, 1 days);
        
        vm.prank(requester);
        escrow.fundEscrow(escrowId);
        
        // Attacker tries to deliver (should fail)
        vm.prank(attacker);
        vm.expectRevert("Only provider");
        escrow.deliverArtifact(escrowId, "ipfs://QmHash");
    }
    
    function test_UnauthorizedRelease() public {
        bytes32 escrowId = escrow.createEscrow(provider, address(token), ESCROW_AMOUNT, 1 days);
        
        vm.prank(requester);
        escrow.fundEscrow(escrowId);
        
        vm.prank(provider);
        escrow.deliverArtifact(escrowId, "ipfs://QmHash");
        
        // Attacker tries to release (should fail)
        vm.prank(attacker);
        vm.expectRevert("Only requester");
        escrow.verifyAndRelease(escrowId);
    }
    
    function test_UnauthorizedRefund() public {
        bytes32 escrowId = escrow.createEscrow(provider, address(token), ESCROW_AMOUNT, 1 days);
        
        vm.prank(requester);
        escrow.fundEscrow(escrowId);
        
        // Attacker tries to refund (should fail)
        vm.prank(attacker);
        vm.expectRevert("Only requester");
        escrow.refund(escrowId);
    }
    
    function test_InvalidArtifactHash() public {
        bytes32 escrowId = escrow.createEscrow(provider, address(token), ESCROW_AMOUNT, 1 days);
        
        vm.prank(requester);
        escrow.fundEscrow(escrowId);
        
        // Empty hash should fail
        vm.prank(provider);
        vm.expectRevert("Invalid artifact hash");
        escrow.deliverArtifact(escrowId, "");
    }
    
    function test_DeliveryAfterDeadline() public {
        bytes32 escrowId = escrow.createEscrow(provider, address(token), ESCROW_AMOUNT, 1 days);
        
        vm.prank(requester);
        escrow.fundEscrow(escrowId);
        
        // Warp past deadline + grace period
        vm.warp(block.timestamp + 1 days + 24 hours + 1);
        
        vm.prank(provider);
        vm.expectRevert("Escrow expired");
        escrow.deliverArtifact(escrowId, "ipfs://QmHash");
    }
    
    function test_RefundInWrongState() public {
        bytes32 escrowId = escrow.createEscrow(provider, address(token), ESCROW_AMOUNT, 1 days);
        
        // Try refund before funding - should fail with "Only requester" since modifier runs first
        vm.prank(requester);
        vm.expectRevert("Only requester");
        escrow.refund(escrowId);
    }
    
    function test_MultipleEscrows() public {
        bytes32 id1 = escrow.createEscrow(provider, address(token), 50e6, 1 days);
        bytes32 id2 = escrow.createEscrow(provider, address(token), 75e6, 2 days);
        
        vm.prank(requester);
        escrow.fundEscrow(id1);
        
        vm.prank(requester);
        escrow.fundEscrow(id2);
        
        assertEq(token.balanceOf(address(escrow)), 125e6);
    }
    
    function test_ReleaseToDeliveredFails() public {
        bytes32 escrowId = escrow.createEscrow(provider, address(token), ESCROW_AMOUNT, 1 days);
        
        vm.prank(requester);
        escrow.fundEscrow(escrowId);
        
        // Try to release without delivery (should fail)
        vm.prank(requester);
        vm.expectRevert("Invalid state");
        escrow.verifyAndRelease(escrowId);
    }
}
