// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title GlobeEscrow
 * @notice Escrow contract for AI-to-AI autonomous commerce
 * @dev State machine: Created → Funded → Delivered → Verified → Released 
 *      OR Created → Funded → Delivered → Disputed → Refunded
 */
contract GlobeEscrow is ReentrancyGuard {

    // ============ State Machine ============
    enum EscrowState { 
        None,       // Does not exist
        Created,    // Escrow created, waiting for funding
        Funded,     // USDC deposited, awaiting delivery
        Delivered,  // Provider submitted artifact
        Verified,   // Requester confirmed delivery
        Released,   // Funds released to provider
        Disputed,   // Dispute opened
        Refunded    // Funds returned to requester
    }

    // ============ Data Structures ============
    struct Escrow {
        address requester;      // Buyer
        address provider;       // Seller  
        address token;          // USDC or stablecoin
        uint256 amount;         // Escrow amount
        uint256 deadline;       // Timeout deadline
        string artifactHash;    // IPFS or hash of delivered artifact
        EscrowState state;
        uint256 createdAt;
    }

    // ============ Events ============
    event EscrowCreated(
        bytes32 indexed escrowId,
        address indexed requester,
        address indexed provider,
        address token,
        uint256 amount,
        uint256 deadline
    );

    event Funded(
        bytes32 indexed escrowId,
        address funder,
        uint256 amount
    );

    event Delivered(
        bytes32 indexed escrowId,
        address indexed provider,
        string artifactHash
    );

    event Verified(
        bytes32 indexed escrowId,
        address indexed requester
    );

    event Released(
        bytes32 indexed escrowId,
        address indexed provider,
        uint256 amount
    );

    event Disputed(
        bytes32 indexed escrowId,
        address disputer,
        string reason
    );

    event Refunded(
        bytes32 indexed escrowId,
        address indexed requester,
        uint256 amount
    );

    // ============ State ============
    mapping(bytes32 => Escrow) public escrows;
    bytes32[] public escrowIds;

    // ============ Modifiers ============
    modifier onlyRequester(bytes32 _escrowId) {
        require(escrows[_escrowId].requester == msg.sender, "Only requester");
        _;
    }

    modifier onlyProvider(bytes32 _escrowId) {
        require(escrows[_escrowId].provider == msg.sender, "Only provider");
        _;
    }

    modifier inState(bytes32 _escrowId, EscrowState _state) {
        require(escrows[_escrowId].state == _state, "Invalid state");
        _;
    }

    // ============ Core Functions ============

    /**
     * @notice Create a new escrow (called by API/requester)
     */
    function createEscrow(
        address _provider,
        address _token,
        uint256 _amount,
        uint256 _durationSeconds
    ) external returns (bytes32 escrowId) {
        require(_provider != address(0), "Invalid provider");
        require(_amount > 0, "Amount must be > 0");
        
        escrowId = keccak256(
            abi.encodePacked(
                msg.sender,
                _provider,
                _token,
                _amount,
                block.timestamp,
                block.chainid
            )
        );

        require(escrows[escrowId].createdAt == 0, "Escrow already exists");

        escrows[escrowId] = Escrow({
            requester: msg.sender,
            provider: _provider,
            token: _token,
            amount: _amount,
            deadline: block.timestamp + _durationSeconds,
            artifactHash: "",
            state: EscrowState.Created,
            createdAt: block.timestamp
        });

        escrowIds.push(escrowId);

        emit EscrowCreated(
            escrowId,
            msg.sender,
            _provider,
            _token,
            _amount,
            escrows[escrowId].deadline
        );
    }

    /**
     * @notice Fund the escrow (called by requester after creation)
     */
    function fundEscrow(bytes32 _escrowId)
        external
        nonReentrant
        inState(_escrowId, EscrowState.Created)
    {
        Escrow storage e = escrows[_escrowId];
        
        // Transfer USDC from requester to this contract
        require(
            IERC20(e.token).transferFrom(msg.sender, address(this), e.amount),
            "Transfer failed"
        );

        e.state = EscrowState.Funded;

        emit Funded(_escrowId, msg.sender, e.amount);
    }

    /**
     * @notice Provider delivers artifact (called by provider)
     */
    function deliverArtifact(bytes32 _escrowId, string calldata _artifactHash)
        external
        nonReentrant
        onlyProvider(_escrowId)
        inState(_escrowId, EscrowState.Funded)
    {
        Escrow storage e = escrows[_escrowId];
        require(block.timestamp <= e.deadline, "Escrow expired");
        require(bytes(_artifactHash).length > 0, "Invalid artifact hash");

        e.artifactHash = _artifactHash;
        e.state = EscrowState.Delivered;

        emit Delivered(_escrowId, msg.sender, _artifactHash);
    }

    /**
     * @notice Requester verifies delivery and releases funds
     */
    function verifyAndRelease(bytes32 _escrowId)
        external
        nonReentrant
        inState(_escrowId, EscrowState.Delivered)
        onlyRequester(_escrowId)
    {
        Escrow storage e = escrows[_escrowId];
        
        e.state = EscrowState.Verified;

        emit Verified(_escrowId, msg.sender);

        // Release funds to provider
        require(
            IERC20(e.token).transfer(e.provider, e.amount),
            "Release transfer failed"
        );

        e.state = EscrowState.Released;

        emit Released(_escrowId, e.provider, e.amount);
    }

    /**
     * @notice Open dispute (can be called by either party)
     */
    function dispute(bytes32 _escrowId, string calldata _reason)
        external
        inState(_escrowId, EscrowState.Funded)
    {
        require(
            msg.sender == escrows[_escrowId].requester ||
            msg.sender == escrows[_escrowId].provider,
            "Not party to escrow"
        );

        escrows[_escrowId].state = EscrowState.Disputed;

        emit Disputed(_escrowId, msg.sender, _reason);
    }

    /**
     * @notice Refund requester (can be called after deadline or in dispute)
     */
    function refund(bytes32 _escrowId)
        external
        nonReentrant
        onlyRequester(_escrowId)
    {
        Escrow storage e = escrows[_escrowId];
        
        require(
            e.state == EscrowState.Funded || 
            e.state == EscrowState.Delivered ||
            e.state == EscrowState.Disputed,
            "Cannot refund in current state"
        );

        // Allow refund if expired OR in disputed state
        require(
            block.timestamp > e.deadline || e.state == EscrowState.Disputed,
            "Deadline not passed or not disputed"
        );

        e.state = EscrowState.Refunded;

        require(
            IERC20(e.token).transfer(e.requester, e.amount),
            "Refund transfer failed"
        );

        emit Refunded(_escrowId, e.requester, e.amount);
    }

    // ============ View Functions ============

    function getEscrow(bytes32 _escrowId) external view returns (Escrow memory) {
        return escrows[_escrowId];
    }

    function getEscrowCount() external view returns (uint256) {
        return escrowIds.length;
    }
}
