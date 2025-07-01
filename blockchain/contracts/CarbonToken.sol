// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract CarbonToken is ERC20, Ownable, Pausable {
    using Counters for Counters.Counter;
    
    Counters.Counter private _projectIds;
    
    struct CarbonProject {
        uint256 projectId;
        string name;
        string description;
        string location;
        uint256 carbonOffset;
        uint256 tokensMinted;
        address projectOwner;
        ProjectStatus status;
        uint256 createdAt;
        uint256 completedAt;
        string verificationDocument;
    }
    
    struct TokenMint {
        uint256 mintId;
        address recipient;
        uint256 amount;
        uint256 carbonOffset;
        uint256 projectId;
        uint256 timestamp;
        string reason;
    }
    
    struct TokenBurn {
        uint256 burnId;
        address burner;
        uint256 amount;
        uint256 timestamp;
        string reason;
    }
    
    enum ProjectStatus { Pending, Active, Completed, Verified, Rejected }
    
    mapping(uint256 => CarbonProject) public carbonProjects;
    mapping(address => uint256[]) public userProjects;
    mapping(address => TokenMint[]) public userMints;
    mapping(address => TokenBurn[]) public userBurns;
    mapping(address => bool) public authorizedMinters;
    mapping(address => bool) public authorizedVerifiers;
    
    uint256 public totalCarbonOffset;
    uint256 public totalProjects;
    uint256 public totalMints;
    uint256 public totalBurns;
    
    event ProjectCreated(uint256 indexed projectId, string name, address owner);
    event ProjectVerified(uint256 indexed projectId, address verifier);
    event TokensMinted(uint256 indexed mintId, address recipient, uint256 amount, uint256 carbonOffset);
    event TokensBurned(uint256 indexed burnId, address burner, uint256 amount);
    event MinterAuthorized(address indexed minter);
    event VerifierAuthorized(address indexed verifier);
    
    modifier onlyAuthorizedMinter() {
        require(authorizedMinters[msg.sender] || msg.sender == owner(), "Not authorized minter");
        _;
    }
    
    modifier onlyAuthorizedVerifier() {
        require(authorizedVerifiers[msg.sender] || msg.sender == owner(), "Not authorized verifier");
        _;
    }
    
    modifier onlyProjectOwner(uint256 projectId) {
        require(carbonProjects[projectId].projectOwner == msg.sender, "Not project owner");
        _;
    }
    
    constructor() ERC20("Carbon Offset Token", "CO2T") {
        _projectIds.increment(); // Start from 1
    }
    
    function createCarbonProject(
        string memory name,
        string memory description,
        string memory location,
        uint256 carbonOffset,
        string memory verificationDocument
    ) external returns (uint256) {
        require(carbonOffset > 0, "Carbon offset must be greater than 0");
        
        uint256 projectId = _projectIds.current();
        _projectIds.increment();
        
        CarbonProject storage project = carbonProjects[projectId];
        project.projectId = projectId;
        project.name = name;
        project.description = description;
        project.location = location;
        project.carbonOffset = carbonOffset;
        project.projectOwner = msg.sender;
        project.status = ProjectStatus.Pending;
        project.createdAt = block.timestamp;
        project.verificationDocument = verificationDocument;
        
        userProjects[msg.sender].push(projectId);
        totalProjects++;
        
        emit ProjectCreated(projectId, name, msg.sender);
        return projectId;
    }
    
    function verifyProject(uint256 projectId) external onlyAuthorizedVerifier {
        require(carbonProjects[projectId].projectId != 0, "Project not found");
        require(carbonProjects[projectId].status == ProjectStatus.Pending, "Project not pending");
        
        carbonProjects[projectId].status = ProjectStatus.Verified;
        
        emit ProjectVerified(projectId, msg.sender);
    }
    
    function rejectProject(uint256 projectId) external onlyAuthorizedVerifier {
        require(carbonProjects[projectId].projectId != 0, "Project not found");
        require(carbonProjects[projectId].status == ProjectStatus.Pending, "Project not pending");
        
        carbonProjects[projectId].status = ProjectStatus.Rejected;
    }
    
    function mintTokens(
        address recipient,
        uint256 amount,
        uint256 projectId,
        string memory reason
    ) external onlyAuthorizedMinter {
        require(carbonProjects[projectId].status == ProjectStatus.Verified, "Project not verified");
        require(amount > 0, "Amount must be greater than 0");
        
        // Calculate carbon offset based on amount (1 token = 1 kg CO2)
        uint256 carbonOffset = amount;
        
        // Update project
        carbonProjects[projectId].tokensMinted += amount;
        totalCarbonOffset += carbonOffset;
        
        // Mint tokens
        _mint(recipient, amount);
        
        // Record mint
        TokenMint memory mint = TokenMint({
            mintId: totalMints,
            recipient: recipient,
            amount: amount,
            carbonOffset: carbonOffset,
            projectId: projectId,
            timestamp: block.timestamp,
            reason: reason
        });
        
        userMints[recipient].push(mint);
        totalMints++;
        
        emit TokensMinted(mint.mintId, recipient, amount, carbonOffset);
    }
    
    function burnTokens(uint256 amount, string memory reason) external {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // Burn tokens
        _burn(msg.sender, amount);
        
        // Record burn
        TokenBurn memory burn = TokenBurn({
            burnId: totalBurns,
            burner: msg.sender,
            amount: amount,
            timestamp: block.timestamp,
            reason: reason
        });
        
        userBurns[msg.sender].push(burn);
        totalBurns++;
        
        emit TokensBurned(burn.burnId, msg.sender, amount);
    }
    
    function authorizeMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = true;
        emit MinterAuthorized(minter);
    }
    
    function revokeMinterAuthorization(address minter) external onlyOwner {
        authorizedMinters[minter] = false;
    }
    
    function authorizeVerifier(address verifier) external onlyOwner {
        authorizedVerifiers[verifier] = true;
        emit VerifierAuthorized(verifier);
    }
    
    function revokeVerifierAuthorization(address verifier) external onlyOwner {
        authorizedVerifiers[verifier] = false;
    }
    
    function getProject(uint256 projectId) external view returns (
        uint256 id,
        string memory name,
        string memory description,
        string memory location,
        uint256 carbonOffset,
        uint256 tokensMinted,
        address projectOwner,
        ProjectStatus status,
        uint256 createdAt,
        uint256 completedAt
    ) {
        CarbonProject storage project = carbonProjects[projectId];
        return (
            project.projectId,
            project.name,
            project.description,
            project.location,
            project.carbonOffset,
            project.tokensMinted,
            project.projectOwner,
            project.status,
            project.createdAt,
            project.completedAt
        );
    }
    
    function getUserProjects(address user) external view returns (uint256[] memory) {
        return userProjects[user];
    }
    
    function getUserMints(address user) external view returns (
        uint256[] memory mintIds,
        uint256[] memory amounts,
        uint256[] memory carbonOffsets,
        uint256[] memory projectIds,
        uint256[] memory timestamps,
        string[] memory reasons
    ) {
        TokenMint[] storage mints = userMints[user];
        uint256 mintCount = mints.length;
        
        mintIds = new uint256[](mintCount);
        amounts = new uint256[](mintCount);
        carbonOffsets = new uint256[](mintCount);
        projectIds = new uint256[](mintCount);
        timestamps = new uint256[](mintCount);
        reasons = new string[](mintCount);
        
        for (uint256 i = 0; i < mintCount; i++) {
            mintIds[i] = mints[i].mintId;
            amounts[i] = mints[i].amount;
            carbonOffsets[i] = mints[i].carbonOffset;
            projectIds[i] = mints[i].projectId;
            timestamps[i] = mints[i].timestamp;
            reasons[i] = mints[i].reason;
        }
    }
    
    function getUserBurns(address user) external view returns (
        uint256[] memory burnIds,
        uint256[] memory amounts,
        uint256[] memory timestamps,
        string[] memory reasons
    ) {
        TokenBurn[] storage burns = userBurns[user];
        uint256 burnCount = burns.length;
        
        burnIds = new uint256[](burnCount);
        amounts = new uint256[](burnCount);
        timestamps = new uint256[](burnCount);
        reasons = new string[](burnCount);
        
        for (uint256 i = 0; i < burnCount; i++) {
            burnIds[i] = burns[i].burnId;
            amounts[i] = burns[i].amount;
            timestamps[i] = burns[i].timestamp;
            reasons[i] = burns[i].reason;
        }
    }
    
    function getCarbonOffset(address user) external view returns (uint256) {
        uint256 totalOffset = 0;
        TokenMint[] storage mints = userMints[user];
        
        for (uint256 i = 0; i < mints.length; i++) {
            totalOffset += mints[i].carbonOffset;
        }
        
        return totalOffset;
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual override {
        super._beforeTokenTransfer(from, to, amount);
        require(!paused(), "Token transfer paused");
    }
} 