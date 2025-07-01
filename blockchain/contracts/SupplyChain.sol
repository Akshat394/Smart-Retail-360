// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract SupplyChain is Ownable, Pausable {
    using Counters for Counters.Counter;
    
    Counters.Counter private _productIds;
    Counters.Counter private _batchIds;
    
    struct Product {
        uint256 productId;
        string name;
        string description;
        string category;
        address manufacturer;
        uint256 createdAt;
        bool isActive;
        mapping(uint256 => Batch) batches;
        uint256[] batchIds;
    }
    
    struct Batch {
        uint256 batchId;
        uint256 productId;
        string batchNumber;
        uint256 quantity;
        uint256 manufacturedAt;
        address manufacturer;
        string location;
        string metadata;
        bool isActive;
        TraceEvent[] traceEvents;
    }
    
    struct TraceEvent {
        uint256 timestamp;
        string location;
        string action;
        address actor;
        string metadata;
    }
    
    struct Supplier {
        address supplierAddress;
        string name;
        string location;
        bool isVerified;
        uint256 verificationDate;
        string[] certifications;
    }
    
    mapping(uint256 => Product) public products;
    mapping(address => Supplier) public suppliers;
    mapping(address => bool) public authorizedManufacturers;
    mapping(bytes32 => bool) public productHashes;
    
    event ProductCreated(uint256 indexed productId, string name, address manufacturer);
    event BatchCreated(uint256 indexed batchId, uint256 indexed productId, string batchNumber);
    event TraceEventAdded(uint256 indexed batchId, string location, string action, address actor);
    event SupplierRegistered(address indexed supplier, string name);
    event ManufacturerAuthorized(address indexed manufacturer);
    
    modifier onlyAuthorizedManufacturer() {
        require(authorizedManufacturers[msg.sender], "Not authorized manufacturer");
        _;
    }
    
    modifier onlyVerifiedSupplier() {
        require(suppliers[msg.sender].isVerified, "Not verified supplier");
        _;
    }
    
    constructor() {
        _productIds.increment(); // Start from 1
        _batchIds.increment(); // Start from 1
    }
    
    function createProduct(
        string memory name,
        string memory description,
        string memory category
    ) external onlyAuthorizedManufacturer returns (uint256) {
        uint256 productId = _productIds.current();
        _productIds.increment();
        
        Product storage product = products[productId];
        product.productId = productId;
        product.name = name;
        product.description = description;
        product.category = category;
        product.manufacturer = msg.sender;
        product.createdAt = block.timestamp;
        product.isActive = true;
        
        emit ProductCreated(productId, name, msg.sender);
        return productId;
    }
    
    function createBatch(
        uint256 productId,
        string memory batchNumber,
        uint256 quantity,
        string memory location,
        string memory metadata
    ) external onlyAuthorizedManufacturer returns (uint256) {
        require(products[productId].isActive, "Product not found or inactive");
        require(products[productId].manufacturer == msg.sender, "Not product manufacturer");
        
        uint256 batchId = _batchIds.current();
        _batchIds.increment();
        
        Batch storage batch = products[productId].batches[batchId];
        batch.batchId = batchId;
        batch.productId = productId;
        batch.batchNumber = batchNumber;
        batch.quantity = quantity;
        batch.manufacturedAt = block.timestamp;
        batch.manufacturer = msg.sender;
        batch.location = location;
        batch.metadata = metadata;
        batch.isActive = true;
        
        products[productId].batchIds.push(batchId);
        
        // Add initial trace event
        TraceEvent memory event_ = TraceEvent({
            timestamp: block.timestamp,
            location: location,
            action: "Manufactured",
            actor: msg.sender,
            metadata: metadata
        });
        batch.traceEvents.push(event_);
        
        emit BatchCreated(batchId, productId, batchNumber);
        return batchId;
    }
    
    function addTraceEvent(
        uint256 productId,
        uint256 batchId,
        string memory location,
        string memory action,
        string memory metadata
    ) external onlyVerifiedSupplier {
        require(products[productId].isActive, "Product not found or inactive");
        require(products[productId].batches[batchId].isActive, "Batch not found or inactive");
        
        TraceEvent memory event_ = TraceEvent({
            timestamp: block.timestamp,
            location: location,
            action: action,
            actor: msg.sender,
            metadata: metadata
        });
        
        products[productId].batches[batchId].traceEvents.push(event_);
        
        emit TraceEventAdded(batchId, location, action, msg.sender);
    }
    
    function registerSupplier(
        string memory name,
        string memory location,
        string[] memory certifications
    ) external {
        require(suppliers[msg.sender].supplierAddress == address(0), "Supplier already registered");
        
        suppliers[msg.sender] = Supplier({
            supplierAddress: msg.sender,
            name: name,
            location: location,
            isVerified: false,
            verificationDate: 0,
            certifications: certifications
        });
        
        emit SupplierRegistered(msg.sender, name);
    }
    
    function verifySupplier(address supplier) external onlyOwner {
        require(suppliers[supplier].supplierAddress != address(0), "Supplier not found");
        suppliers[supplier].isVerified = true;
        suppliers[supplier].verificationDate = block.timestamp;
    }
    
    function authorizeManufacturer(address manufacturer) external onlyOwner {
        authorizedManufacturers[manufacturer] = true;
        emit ManufacturerAuthorized(manufacturer);
    }
    
    function revokeManufacturerAuthorization(address manufacturer) external onlyOwner {
        authorizedManufacturers[manufacturer] = false;
    }
    
    function getProduct(uint256 productId) external view returns (
        uint256 id,
        string memory name,
        string memory description,
        string memory category,
        address manufacturer,
        uint256 createdAt,
        bool isActive
    ) {
        Product storage product = products[productId];
        return (
            product.productId,
            product.name,
            product.description,
            product.category,
            product.manufacturer,
            product.createdAt,
            product.isActive
        );
    }
    
    function getBatch(uint256 productId, uint256 batchId) external view returns (
        uint256 id,
        string memory batchNumber,
        uint256 quantity,
        uint256 manufacturedAt,
        address manufacturer,
        string memory location,
        string memory metadata,
        bool isActive
    ) {
        Batch storage batch = products[productId].batches[batchId];
        return (
            batch.batchId,
            batch.batchNumber,
            batch.quantity,
            batch.manufacturedAt,
            batch.manufacturer,
            batch.location,
            batch.metadata,
            batch.isActive
        );
    }
    
    function getBatchTraceEvents(uint256 productId, uint256 batchId) external view returns (
        uint256[] memory timestamps,
        string[] memory locations,
        string[] memory actions,
        address[] memory actors,
        string[] memory metadatas
    ) {
        TraceEvent[] storage events = products[productId].batches[batchId].traceEvents;
        uint256 eventCount = events.length;
        
        timestamps = new uint256[](eventCount);
        locations = new string[](eventCount);
        actions = new string[](eventCount);
        actors = new address[](eventCount);
        metadatas = new string[](eventCount);
        
        for (uint256 i = 0; i < eventCount; i++) {
            timestamps[i] = events[i].timestamp;
            locations[i] = events[i].location;
            actions[i] = events[i].action;
            actors[i] = events[i].actor;
            metadatas[i] = events[i].metadata;
        }
    }
    
    function getProductBatchIds(uint256 productId) external view returns (uint256[] memory) {
        return products[productId].batchIds;
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
} 