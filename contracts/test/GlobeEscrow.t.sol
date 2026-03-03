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

contract GlobeEscrowTest is Test {
    GlobeEscrow public escrow;
    MockToken public token;
    
    address public requester = makeAddr("requester");
    address public provider = makeAddr("provider");
    
    uint256 constant ESCROW_AMOUNT = 100e6; // 100 USDC
    
    function setUp() public {
        escrow = new GlobeEscrow();
        token = new MockToken();
        
        // Mint tokens to requester
        token.mint(requester, 1000e6);
        
        // Approve escrow to spend requester's tokens
        vm.prank(requester);
        token.approve(address(escrow), type(uint256).max);
    }
    
    function test_CreateAndFundEscrow() public {
        vm.prank(requester);
        bytes32 escrowId = escrow.createEscrow(
            provider,
            address(token),
            ESCROW_AMOUNT,
            1 days
        );
        
        // Fund the escrow
        vm.prank(requester);
        escrow.fundEscrow(escrowId);
        
        assertEq(token.balanceOf(address(escrow)), ESCROW_AMOUNT);
    }
    
    function test_FullHappyPath() public {
        vm.prank(requester);
        bytes32 escrowId = escrow.createEscrow(
            provider,
            address(token),
            ESCROW_AMOUNT,
            1 days
        );
        
        // Fund
        vm.prank(requester);
        escrow.fundEscrow(escrowId);
        
        // Deliver
        vm.prank(provider);
        escrow.deliverArtifact(escrowId, "ipfs://QmHash...");
        
        // Verify and release
        vm.prank(requester);
        escrow.verifyAndRelease(escrowId);
        
        // Check provider got paid
        assertEq(token.balanceOf(provider), ESCROW_AMOUNT);
    }
    
    function test_RefundAfterDeadline() public {
        vm.prank(requester);
        bytes32 escrowId = escrow.createEscrow(
            provider,
            address(token),
            ESCROW_AMOUNT,
            1 days
        );
        
        vm.prank(requester);
        escrow.fundEscrow(escrowId);
        
        // Warp past deadline
        vm.warp(block.timestamp + 2 days);
        
        vm.prank(requester);
        escrow.refund(escrowId);
        
        assertEq(token.balanceOf(requester), 1000e6);
    }
}
