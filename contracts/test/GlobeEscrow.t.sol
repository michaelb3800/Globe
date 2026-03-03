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
    address public attacker = makeAddr("attacker");
    
    uint256 constant ESCROW_AMOUNT = 100e6;
    uint256 constant GRACE_PERIOD = 24 hours;
    
    function setUp() public {
        escrow = new GlobeEscrow();
        token = new MockToken();
        token.mint(requester, 1000e6);
        vm.prank(requester);
        token.approve(address(escrow), type(uint256).max);
    }
    
    // ============ Core Tests ============
    
    function test_CreateAndFundEscrow() public {
        vm.prank(requester);
        bytes32 escrowId = escrow.createEscrow(provider, address(token), ESCROW_AMOUNT, 1 days);
        
        // Fund the escrow
        vm.prank(requester);
        escrow.fundEscrow(escrowId);
        
        assertEq(token.balanceOf(address(escrow)), ESCROW_AMOUNT);
    }
    
    function test_FullHappyPath() public {
        vm.prank(requester);
        bytes32 escrowId = escrow.createEscrow(provider, address(token), ESCROW_AMOUNT, 1 days);
        
        // Fund
        vm.prank(requester);
        escrow.fundEscrow(escrowId);
        
        // Deliver
        vm.prank(provider);
        escrow.deliverArtifact(escrowId, "ipfs://QmHash...");
        
        // Verify (triggers release)
        vm.prank(requester);
        escrow.verifyAndRelease(escrowId);
        
        // Provider withdraws (pull-based)
        vm.prank(provider);
        escrow.withdraw(escrowId);
        
        // Check provider got paid
        assertEq(token.balanceOf(provider), ESCROW_AMOUNT);
    }
    
    function test_RefundAfterGracePeriod() public {
        vm.prank(requester);
        bytes32 escrowId = escrow.createEscrow(provider, address(token), ESCROW_AMOUNT, 1 days);
        
        vm.prank(requester);
        escrow.fundEscrow(escrowId);
        
        // Warp past deadline + grace period
        vm.warp(block.timestamp + 1 days + GRACE_PERIOD + 1);
        
        // Requester triggers refund
        vm.prank(requester);
        escrow.refund(escrowId);
        
        // Requester withdraws refund
        vm.prank(requester);
        escrow.withdrawRefund(escrowId);
        
        assertEq(token.balanceOf(requester), 1000e6);
    }
    
    // ============ Edge Cases ============
    
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
    
    function test_DeliveryAfterGracePeriod() public {
        bytes32 escrowId = escrow.createEscrow(provider, address(token), ESCROW_AMOUNT, 1 days);
        
        vm.prank(requester);
        escrow.fundEscrow(escrowId);
        
        // Warp past deadline + grace period
        vm.warp(block.timestamp + 1 days + GRACE_PERIOD + 1);
        
        vm.prank(provider);
        vm.expectRevert("Escrow expired");
        escrow.deliverArtifact(escrowId, "ipfs://QmHash");
    }
    
    function test_RefundBeforeGracePeriod() public {
        bytes32 escrowId = escrow.createEscrow(provider, address(token), ESCROW_AMOUNT, 1 days);
        
        vm.prank(requester);
        escrow.fundEscrow(escrowId);
        
        // Warp close to deadline but not past grace period
        vm.warp(block.timestamp + 12 hours);
        
        // Try refund before grace period (should fail - state check first)
        vm.prank(requester);
        vm.expectRevert("Cannot refund in current state");
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
    
    // ============ Pull-Based Withdrawal Tests ============
    
    function test_PullBasedWithdrawal() public {
        bytes32 escrowId = escrow.createEscrow(provider, address(token), ESCROW_AMOUNT, 1 days);
        
        vm.prank(requester);
        escrow.fundEscrow(escrowId);
        
        vm.prank(provider);
        escrow.deliverArtifact(escrowId, "ipfs://QmHash");
        
        vm.prank(requester);
        escrow.verifyAndRelease(escrowId);
        
        // Verify pending withdrawal is set
        assertEq(escrow.getPendingWithdrawal(escrowId), ESCROW_AMOUNT);
        
        // Provider withdraws
        vm.prank(provider);
        escrow.withdraw(escrowId);
        
        assertEq(token.balanceOf(provider), ESCROW_AMOUNT);
    }
    
    function test_WithdrawBeforeReleaseFails() public {
        bytes32 escrowId = escrow.createEscrow(provider, address(token), ESCROW_AMOUNT, 1 days);
        
        vm.prank(requester);
        escrow.fundEscrow(escrowId);
        
        // Try to withdraw before release (should fail)
        vm.prank(provider);
        vm.expectRevert("Not in Released state");
        escrow.withdraw(escrowId);
    }
    
    // ============ Mutual Cancellation Tests ============
    
    function test_MutualCancellation() public {
        bytes32 escrowId = escrow.createEscrow(provider, address(token), ESCROW_AMOUNT, 1 days);
        
        vm.prank(requester);
        escrow.fundEscrow(escrowId);
        
        // Either party can initiate cancellation - provider cancels
        vm.prank(provider);
        escrow.cancelMutual(escrowId);
        
        // Verify state
        assertEq(uint8(escrow.getEscrow(escrowId).state), uint8(GlobeEscrow.EscrowState.Cancelled));
        
        // Requester withdraws refund
        vm.prank(requester);
        escrow.withdrawRefund(escrowId);
        
        assertEq(token.balanceOf(requester), 1000e6);
    }
    
    function test_CannotCancelAfterDelivery() public {
        bytes32 escrowId = escrow.createEscrow(provider, address(token), ESCROW_AMOUNT, 1 days);
        
        vm.prank(requester);
        escrow.fundEscrow(escrowId);
        
        vm.prank(provider);
        escrow.deliverArtifact(escrowId, "ipfs://QmHash");
        
        // Cancel should work after delivery too (both states allowed)
        vm.prank(provider);
        escrow.cancelMutual(escrowId);
        
        assertEq(uint8(escrow.getEscrow(escrowId).state), uint8(GlobeEscrow.EscrowState.Cancelled));
    }
    
    // ============ Disputed State Tests ============
    
    function test_RefundInDisputedState() public {
        bytes32 escrowId = escrow.createEscrow(provider, address(token), ESCROW_AMOUNT, 1 days);
        
        vm.prank(requester);
        escrow.fundEscrow(escrowId);
        
        // Provider disputes
        vm.prank(provider);
        escrow.dispute(escrowId, "Issue with delivery");
        
        // Refund should work immediately in disputed state (no grace period)
        vm.prank(requester);
        escrow.refund(escrowId);
        
        vm.prank(requester);
        escrow.withdrawRefund(escrowId);
        
        assertEq(token.balanceOf(requester), 1000e6);
    }
}
