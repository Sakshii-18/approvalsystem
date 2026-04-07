package com.project.approvalsystem.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.project.approvalsystem.entity.LeaveRequest;

import java.util.List;

public interface LeaveRepository extends JpaRepository<LeaveRequest, Long> {

    // Get all leave requests for a specific student
    List<LeaveRequest> findByUserId(Long userId);

    List<LeaveRequest> findByTeacherId(Long teacherId);

    List<LeaveRequest> findByUser_Department(String department);

}
