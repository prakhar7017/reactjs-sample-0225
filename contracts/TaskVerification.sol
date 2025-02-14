// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract TaskVerification {
    mapping(string => bool) private verifiedTasks;
    mapping(string => address) private taskVerifiers;
    
    event TaskVerified(string taskId, address verifier);
    
    function verifyTask(string memory taskId) public returns (bool) {
        require(!verifiedTasks[taskId], "Task already verified");
        
        verifiedTasks[taskId] = true;
        taskVerifiers[taskId] = msg.sender;
        
        emit TaskVerified(taskId, msg.sender);
        return true;
    }
    
    function isTaskVerified(string memory taskId) public view returns (bool) {
        return verifiedTasks[taskId];
    }
    
    function getTaskVerifier(string memory taskId) public view returns (address) {
        require(verifiedTasks[taskId], "Task not verified");
        return taskVerifiers[taskId];
    }
}