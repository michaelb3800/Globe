// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {GlobeEscrow} from "../src/GlobeEscrow.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PullWithdrawalRegressionTest
 * @notice Regression tests to ensure pull-based withdrawal is implemented correctly
 * 
 * SPEC REQUIREMENT: Pull-based withdrawal (no auto-transfer)
 * "Never transfer() funds automatically. Use withdraw() function where payee pulls funds."
 */
contract PullWithdrawalRegressionTest is Test {
    GlobeEscrow public escrow;
    MockToken public token;
    
    address public requester = makeAddr("requester");
    address public provider = makeAddr("provider");
    
    uint256 constant ESCROW_AMOUNT = 100e6;
    uint256 constant DURATION = 1 days;
    
    function setUp() public {
        escrow = new GlobeEscrow();
        token = new MockToken();
        token.mint(requester, 1000e6);
        
        vm.prank(requester);
        token.approve(address(escrow), type(uint256).max);
    }
    
    // ============ REGRESSION TESTS ============
    
    /**
     * @notice REGRESSION: verifyAndRelease should NOT auto-transfer
     * 
     * If this test passes, it means the contract is VIOLATING the spec.
     * After verifyAndRelease, escrow balance should STILL exist.
     * Funds should only move when withdraw() is called.
     */
    function test_regression_noAutoTransferInVerifyAndRelease() public {
        vm.prank(requester);
        bytes32 escrowId = escrow.createEscrow(provider, address(token), ESCROW_AMOUNT, DURATION);
        
        vm.prank(requester);
        escrow.fundEscrow(escrowId);
        
        vm.prank(provider);
        escrow.deliverArtifact(escrowId, "ipfs://QmHash");
        
        // verifyAndRelease should set state to Released but NOT transfer
        vm.prank(requester);
        escrow.verifyAndRelease(escrowId);
        
        // CRITICAL: Balance should STILL be in escrow (waiting for withdraw)
        // If balance is 0, the contract is violating pull-based withdrawal spec
        uint256 escrowBalance = token.balanceOf(address(escrow));
        
        // This assertion SHOULD FAIL if auto-transfer is implemented
        // After fix, this will pass (balance remains until withdraw)
        assertEq(escrowBalance, ESCROW_AMOUNT, "REGRESSION: Auto-transfer detected! Spec violation.");
    }
    
    /**
     * @notice verifyAndRelease should transition state to Released
     */
    function test_verifyAndRelease_setsStateToReleased() public {
        vm.prank(requester);
        bytes32 escrowId = escrow.createEscrow(provider, address(token), ESCROW_AMOUNT, DURATION);
        
        vm.prank(requester);
        escrow.fundEscrow(escrowId);
        
        vm.prank(provider);
        escrow.deliverArtifact(escrowId, "ipfs://QmHash");
        
        vm.prank(requester);
        escrow.verifyAndRelease(escrowId);
        
        // State should be Released
        (, , , , , , , uint8 state, , ) = escrow.getEscrow(escrowId);
        assertEq(state, 6); // Released = 6 in enum (assuming None=0)
    }
    
    /**
     * @notice withdraw() should transfer funds to provider
     */
    function test_withdraw_transfersToProvider() public {
        vm.prank(requester);
        bytes32 escrowId = escrow.createEscrow(provider, address(token), ESCROW_AMOUNT, DURATION);
        
        vm.prank(requester);
        escrow.fundEscrow(escrowId);
        
        vm.prank(provider);
        escrow.deliverArtifact(escrowId, "ipfs://QmHash");
        
        vm.prank(requester);
        escrow.verifyAndRelease(escrowId);
        
        uint256 providerBalanceBefore = token.balanceOf(provider);
        
        vm.prank(provider);
        escrow.withdraw(escrowId);
        
        uint256 providerBalanceAfter = token.balanceOf(provider);
        assertEq(providerBalanceAfter - providerBalanceBefore, ESCROW_AMOUNT);
    }
    
    /**
     * @notice withdraw() should revert if nothing to withdraw
     */
    function test_withdraw_twice_reverts() public {
        vm.prank(requester);
        bytes32 escrowId = escrow.createEscrow(provider, address(token), ESCROW_AMOUNT, DURATION);
        
        vm.prank(requester);
        escrow.fundEscrow(escrowId);
        
        vm.prank(provider);
        escrow.deliverArtifact(escrowId, "ipfs://QmHash");
        
        vm.prank(requester);
        escrow.verifyAndRelease(escrowId);
        
        // First withdraw succeeds
        vm.prank(provider);
        escrow.withdraw(escrowId);
        
        // Second withdraw should revert
        vm.prank(provider);
        vm.expectRevert();
        escrow.withdraw(escrowId);
    }
    
    /**
     * @notice Only provider can withdraw
     */
    function test_withdraw_onlyProvider() public {
        vm.prank(requester);
        bytes32 escrowId = escrow.createEscrow(provider, address(token), ESCROW_AMOUNT, DURATION);
        
        vm.prank(requester);
        escrow.fundEscrow(escrowId);
        
        vm.prank(provider);
        escrow.deliverArtifact(escrowId, "ipfs://QmHash");
        
        vm.prank(requester);
        escrow.verifyAndRelease(escrowId);
        
        // Requester tries to withdraw (should fail)
        vm.prank(requester);
        vm.expectRevert();
        escrow.withdraw(escrowId);
    }
}

// Minimal mock token
contract MockToken is IERC20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply;
    
    function mint(address to, uint256 amount) external { balanceOf[to] += amount; totalSupply += amount; }
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount);
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount);
        require(allowance[from][msg.sender] >= amount);
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        return true;
    }
}
